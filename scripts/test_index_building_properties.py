import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parent))

import index_building_properties as indexer


class IndexBuildingPropertiesTest(unittest.TestCase):
    def test_embedding_text_is_deterministic(self):
        row = {
            "code": "DN-BLD-000001",
            "name": "Nha Nguyen Luong Bang",
            "addressLine": "546 Nguyen Luong Bang",
            "street": "Nguyen Luong Bang",
            "ward": "Hoa Khanh Bac",
            "district": "Lien Chieu",
            "city": "Da Nang",
            "propertyType": "building",
            "status": "ACTIVE",
        }

        self.assertEqual(
            indexer.embedding_text(row),
            "DN-BLD-000001 Nha Nguyen Luong Bang 546 Nguyen Luong Bang "
            "Nguyen Luong Bang Hoa Khanh Bac Lien Chieu Da Nang building ACTIVE",
        )

    def test_active_rows_skip_deleted_records(self):
        rows = [
            {"id": "active", "deletedAt": None},
            {"id": "deleted", "deletedAt": "2026-05-03T00:00:00.000Z"},
        ]

        self.assertEqual([row["id"] for row in indexer.active_rows(rows)], ["active"])

    def test_document_id_equals_building_property_id(self):
        row = {
            "id": "property-1",
            "code": "DN-BLD-000001",
            "deletedAt": None,
            "centroidLat": 16.071,
            "centroidLng": 108.15,
        }

        action = indexer.index_action("building_properties_v1", row, [0.1] * 384)

        self.assertEqual(action["_index"], "building_properties_v1")
        self.assertEqual(action["_id"], "property-1")
        self.assertEqual(action["_source"]["embedding"], [0.1] * 384)
        self.assertFalse(action["_source"]["deleted"])

    def test_bulk_index_uses_stable_ids_for_retries(self):
        client = MagicMock()
        rows = [{"id": "property-1", "code": "DN-BLD-000001", "deletedAt": None}]

        indexer.bulk_index_rows(client, "building_properties_v1", rows, [[0.1] * 384])
        indexer.bulk_index_rows(client, "building_properties_v1", rows, [[0.2] * 384])

        first_actions = client.bulk.call_args_list[0].kwargs["operations"]
        second_actions = client.bulk.call_args_list[1].kwargs["operations"]
        self.assertEqual(first_actions[0]["index"]["_id"], "property-1")
        self.assertEqual(second_actions[0]["index"]["_id"], "property-1")


if __name__ == "__main__":
    unittest.main()
