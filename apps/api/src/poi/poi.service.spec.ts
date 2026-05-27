import { CategoryMapper } from "./category-mapper";
import { PoiSemanticService } from "./poi-semantic.service";
import { PoiImportService } from "./poi-import.service";

describe("PoiService semantic search", () => {
  const locations = [
    { ward: "Hải Châu I", district: "Hải Châu" },
    { ward: "Thạch Thang", district: "Hải Châu" },
    { ward: "Nam Dương", district: "Hải Châu" }
  ];

  function semanticServiceWithSqlite() {
    const sqlite = {
      all: jest.fn((sql: string) => {
        if (sql.includes('SELECT DISTINCT "ward"')) {
          return locations;
        }
        if (sql.includes("COUNT(*) AS count") && !sql.includes('GROUP BY')) {
          return [{ count: 162 }];
        }
        if (sql.includes('GROUP BY "ward"')) {
          return [
            {
              ward: "Hải Châu I",
              district: "Hải Châu",
              count: 226,
              centerLat: 16.0698,
              centerLng: 108.2217
            },
            {
              ward: "Thạch Thang",
              district: "Hải Châu",
              count: 180,
              centerLat: 16.0766,
              centerLng: 108.2187
            }
          ];
        }
        return [
          {
            id: "place_1",
            code: "DN-POI-000001",
            name: "Highlands Coffee",
            propertyType: "coffee_shop",
            addressLine: "203 Đường Ông Ích Khiêm",
            street: "Quận Hải Châu",
            ward: "Thạch Thang",
            district: "Hải Châu",
            city: "Da Nang",
            centroidLat: 16.0704,
            centroidLng: 108.2134
          }
        ];
      })
    };
    return {
      service: new PoiSemanticService(new CategoryMapper(), sqlite as never),
      sqlite
    };
  }

  it("detects POI categories inside long Vietnamese queries with and without accents", () => {
    const mapper = new CategoryMapper();
    expect(mapper.findCategories("phuong nao nhieu quan ca phe nhat o Hai Chau")).toEqual(
      expect.arrayContaining(["cafe", "coffee_shop"])
    );
    expect(
      mapper.findCategories("nhà hàng dày đặc nhất theo phường trong Hải Châu")
    ).toEqual(expect.arrayContaining(["restaurant"]));
  });

  it("answers highest-density cafe queries by ward", async () => {
    const { service } = semanticServiceWithSqlite();
    const result = await service.semanticSearch("phuong nao nhieu quan ca phe nhat o Hai Chau");
    expect(result.answer).toMatchObject({
      type: "poi-density",
      count: 226,
      filters: { district: "Hải Châu", category: "quán cà phê" }
    });
    expect(result.map?.regions[0]).toMatchObject({ ward: "Hải Châu I", count: 226 });
  });

  it("answers count and list queries with canonical ward matching", async () => {
    const { service } = semanticServiceWithSqlite();
    await expect(service.semanticSearch("co bao nhieu khach san o phuong Hai Chau I")).resolves.toMatchObject({
      answer: { type: "poi-count", count: 162, filters: { ward: "Hải Châu I" } }
    });
    await expect(service.semanticSearch("liet ke quan ca phe o Thach Thang")).resolves.toMatchObject({
      answer: { type: "poi-list", count: 1, filters: { ward: "Thạch Thang" } },
      items: [expect.objectContaining({ name: "Highlands Coffee", propertyType: "coffee_shop" })]
    });
  });

  it("treats concise category and district searches as list queries", async () => {
    const { service, sqlite } = semanticServiceWithSqlite();

    const result = await service.semanticSearch("cafe o Hai Chau");

    expect(result).toMatchObject({
      answer: {
        type: "poi-list",
        count: 1,
        filters: { district: "Hải Châu", category: "quán cà phê" }
      },
      items: [
        expect.objectContaining({
          name: "Highlands Coffee",
          district: "Hải Châu"
        })
      ]
    });
    expect(sqlite.all).toHaveBeenLastCalledWith(
      expect.stringContaining("FROM \"BuildingProperty\""),
      "cafe",
      "coffee_shop",
      "Hải Châu",
      20
    );
  });

  it("converts POI category into the asset property type", async () => {
    const prisma = {
      place: {
        findUnique: jest.fn().mockResolvedValue({
          id: "place_1",
          overtureId: "ov_1",
          name: "Highlands Coffee",
          category: "coffee_shop",
          street: "Bạch Đằng",
          ward: "Hải Châu I",
          district: "Hải Châu",
          city: "Da Nang",
          latitude: 16.07,
          longitude: 108.22,
          geometry: { type: "Point", coordinates: [108.22, 16.07] }
        })
      },
      buildingProperty: {
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(7),
        create: jest.fn().mockResolvedValue({ id: "asset_1", code: "DN-POI-000008" })
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({})
      }
    };
    const service = new PoiImportService(prisma as never);

    await service.convertToAsset("place_1", "user_1");

    expect(prisma.buildingProperty.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          propertyType: "coffee_shop",
          searchText: expect.stringContaining("coffee_shop")
        })
      })
    );
  });
});
