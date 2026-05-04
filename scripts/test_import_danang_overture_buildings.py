import json
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

from shapely.geometry import Polygon, mapping

sys.path.insert(0, str(Path(__file__).resolve().parent))

import import_danang_overture_buildings as importer


class ImportDaNangOvertureBuildingsTest(unittest.TestCase):
    def test_deterministic_overture_code_uses_overture_id(self):
        self.assertEqual(
            importer.overture_code("76894118-6ffc-45fd-b3dd-da481b71d71e"),
            "DN-OVT-768941186FFC45FDB3DDDA481B71D71E",
        )

    def test_stage_row_prefers_overture_property_id_over_fiona_feature_id(self):
        ward = importer.WardBoundary(
            district="Lien Chieu",
            ward="Hoa Khanh Bac",
            geometry=Polygon([(0, 0), (2, 0), (2, 2), (0, 2), (0, 0)]),
        )
        feature = {
            "id": "1",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[(0.2, 0.2), (0.4, 0.2), (0.4, 0.4), (0.2, 0.4), (0.2, 0.2)]],
            },
            "properties": {"id": "overture-building-uuid"},
        }

        row = importer.stage_row_from_feature(feature, [ward], "2026-04-20")

        assert row is not None
        self.assertEqual(row.overture_id, "overture-building-uuid")
        self.assertEqual(row.code, "DN-OVT-OVERTUREBUILDINGUUID")

    def test_building_inside_ward_becomes_stage_row(self):
        ward = importer.WardBoundary(
            district="Lien Chieu",
            ward="Hoa Khanh Bac",
            geometry=Polygon([(0, 0), (2, 0), (2, 2), (0, 2), (0, 0)]),
        )
        feature = {
            "id": "building-1",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[(0.2, 0.2), (0.4, 0.2), (0.4, 0.4), (0.2, 0.4), (0.2, 0.2)]],
            },
            "properties": {"height": 12.5, "num_floors": 3, "names": {"primary": "Nha mau"}},
        }

        row = importer.stage_row_from_feature(feature, [ward], "2026-04-20")

        self.assertIsNotNone(row)
        assert row is not None
        self.assertEqual(row.ward, "Hoa Khanh Bac")
        self.assertEqual(row.district, "Lien Chieu")
        self.assertEqual(row.code, "DN-OVT-BUILDING1")
        self.assertEqual(row.centroid_lat, 0.3)
        self.assertEqual(row.centroid_lng, 0.3)
        self.assertIn("hoa khanh bac", row.search_text_normalized)

    def test_building_outside_wards_is_skipped(self):
        ward = importer.WardBoundary(
            district="Lien Chieu",
            ward="Hoa Khanh Bac",
            geometry=Polygon([(0, 0), (2, 0), (2, 2), (0, 2), (0, 0)]),
        )
        feature = {
            "id": "building-1",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[(3, 3), (4, 3), (4, 4), (3, 4), (3, 3)]],
            },
            "properties": {},
        }

        self.assertIsNone(importer.stage_row_from_feature(feature, [ward], "2026-04-20"))

    def test_dry_run_summary_counts_importable_and_outside_scope(self):
        ward = importer.WardBoundary(
            district="Lien Chieu",
            ward="Hoa Khanh Bac",
            geometry=Polygon([(0, 0), (2, 0), (2, 2), (0, 2), (0, 0)]),
        )
        features = [
            {
                "id": "inside",
                "geometry": mapping(Polygon([(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)])),
                "properties": {},
            },
            {
                "id": "outside",
                "geometry": mapping(Polygon([(3, 3), (4, 3), (4, 4), (3, 4), (3, 3)])),
                "properties": {},
            },
        ]

        summary = importer.dry_run_summary(features, [ward], "2026-04-20", raw_layer_count=2)

        self.assertEqual(summary.raw_layer_count, 2)
        self.assertEqual(summary.importable_count, 1)
        self.assertEqual(summary.outside_scope_count, 1)
        self.assertEqual(summary.district_counts, {"Lien Chieu": 1})

    def test_dry_run_summary_can_filter_to_selected_districts(self):
        wards = [
            importer.WardBoundary(
                district="Lien Chieu",
                ward="Hoa Khanh Bac",
                geometry=Polygon([(0, 0), (2, 0), (2, 2), (0, 2), (0, 0)]),
            ),
            importer.WardBoundary(
                district="Hoa Vang",
                ward="Hoa Ninh",
                geometry=Polygon([(3, 3), (5, 3), (5, 5), (3, 5), (3, 3)]),
            ),
        ]
        features = [
            {
                "id": "lien-chieu",
                "geometry": mapping(Polygon([(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)])),
                "properties": {},
            },
            {
                "id": "hoa-vang",
                "geometry": mapping(Polygon([(3, 3), (4, 3), (4, 4), (3, 4), (3, 3)])),
                "properties": {},
            },
        ]

        summary = importer.dry_run_summary(
            features,
            wards,
            "2026-04-20",
            raw_layer_count=2,
            districts={"lien chieu"},
        )

        self.assertEqual(summary.importable_count, 1)
        self.assertEqual(summary.outside_scope_count, 1)
        self.assertEqual(summary.district_counts, {"Lien Chieu": 1})

    def test_upsert_sql_preserves_manual_management_fields(self):
        sql = importer.UPSERT_SQL

        self.assertIn('COALESCE("BuildingProperty"."name", EXCLUDED."name")', sql)
        self.assertIn('COALESCE("BuildingProperty"."street", EXCLUDED."street")', sql)
        self.assertIn('COALESCE("BuildingProperty"."addressLine", EXCLUDED."addressLine")', sql)
        self.assertNotIn('"code" = EXCLUDED."code"', sql)
        self.assertNotIn('"status" = EXCLUDED."status"', sql)

    def test_stage_batch_uses_executemany_with_json_payloads(self):
        connection = MagicMock()
        cursor = connection.cursor.return_value.__enter__.return_value
        row = importer.BuildingStageRow(
            code="DN-OVT-ABC",
            overture_id="abc",
            name=None,
            address_line=None,
            street=None,
            ward="Hoa Khanh Bac",
            district="Lien Chieu",
            city="Da Nang",
            property_type="building",
            status="ACTIVE",
            source="overture",
            source_version="2026-04-20",
            level=None,
            height=None,
            floors=None,
            area_sqm=None,
            centroid_lat=16.0,
            centroid_lng=108.0,
            bbox={"xmin": 108, "ymin": 16, "xmax": 108.1, "ymax": 16.1},
            geometry={"type": "Polygon", "coordinates": []},
            attributes={"id": "abc"},
            search_text="DN-OVT-ABC Hoa Khanh Bac",
            search_text_normalized="dn ovt abc hoa khanh bac",
        )

        importer.stage_rows(connection, [row])

        cursor.executemany.assert_called_once()
        params = cursor.executemany.call_args.args[1][0]
        self.assertEqual(params[0], "DN-OVT-ABC")
        self.assertEqual(json.loads(params[18]), row.bbox)

    def test_parse_storage_size_handles_neon_units(self):
        self.assertEqual(importer.parse_storage_size_to_bytes("512MB"), 512 * 1024 * 1024)
        self.assertEqual(importer.parse_storage_size_to_bytes("1 GB"), 1024 * 1024 * 1024)
        self.assertIsNone(importer.parse_storage_size_to_bytes(""))

    def test_storage_preflight_blocks_stage_that_exceeds_limit(self):
        snapshot = importer.StorageSnapshot(
            max_bytes=512 * 1024 * 1024,
            db_bytes=500 * 1024 * 1024,
            property_bytes=10 * 1024 * 1024,
            stage_bytes=500 * 1024 * 1024,
            property_row_count=100,
            overture_count=100,
        )

        message = importer.storage_capacity_error(snapshot, target_importable_count=424_486)

        assert message is not None
        self.assertIn("staging table", message)

    def test_storage_preflight_blocks_projected_final_table_that_exceeds_limit(self):
        snapshot = importer.StorageSnapshot(
            max_bytes=512 * 1024 * 1024,
            db_bytes=492 * 1024 * 1024,
            property_bytes=484 * 1024 * 1024,
            stage_bytes=0,
            property_row_count=235_250,
            overture_count=235_250,
        )

        message = importer.storage_capacity_error(snapshot, target_importable_count=424_486)

        assert message is not None
        self.assertIn("projected BuildingProperty size", message)


if __name__ == "__main__":
    unittest.main()
