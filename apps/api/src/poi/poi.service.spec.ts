import { CategoryMapper } from "./category-mapper";
import { PoiService } from "./poi.service";

describe("PoiService semantic search", () => {
  const locations = [
    { ward: "H\u1ea3i Ch\u00e2u I", district: "H\u1ea3i Ch\u00e2u" },
    { ward: "Th\u1ea1ch Thang", district: "H\u1ea3i Ch\u00e2u" },
    { ward: "Nam D\u01b0\u01a1ng", district: "H\u1ea3i Ch\u00e2u" }
  ];

  function serviceWithSqlite() {
    const sqlite = {
      all: jest.fn((sql: string) => {
        if (sql.includes("SELECT DISTINCT ward")) {
          return locations;
        }
        if (sql.includes("COUNT(*) AS count") && !sql.includes("GROUP BY")) {
          return [{ count: 162 }];
        }
        if (sql.includes("GROUP BY ward")) {
          return [
            {
              ward: "H\u1ea3i Ch\u00e2u I",
              district: "H\u1ea3i Ch\u00e2u",
              count: 226,
              centerLat: 16.0698,
              centerLng: 108.2217
            },
            {
              ward: "Th\u1ea1ch Thang",
              district: "H\u1ea3i Ch\u00e2u",
              count: 180,
              centerLat: 16.0766,
              centerLng: 108.2187
            }
          ];
        }
        return [
          {
            id: "place_1",
            name: "Highlands Coffee",
            category: "coffee_shop",
            address: "203 \u0110\u01b0\u1eddng \u00d4ng \u00cdch Khi\u00eam",
            street: "Qu\u1eadn H\u1ea3i Ch\u00e2u",
            ward: "Th\u1ea1ch Thang",
            district: "H\u1ea3i Ch\u00e2u",
            city: "Da Nang",
            latitude: 16.0704,
            longitude: 108.2134,
            confidence: 0.9
          }
        ];
      })
    };
    return {
      service: new PoiService({} as never, new CategoryMapper(), sqlite as never),
      sqlite
    };
  }

  it("detects POI categories inside long Vietnamese queries with and without accents", () => {
    const mapper = new CategoryMapper();
    expect(mapper.findCategories("phuong nao nhieu quan ca phe nhat o Hai Chau")).toEqual(
      expect.arrayContaining(["cafe", "coffee_shop"])
    );
    expect(
      mapper.findCategories("nh\u00e0 h\u00e0ng d\u00e0y \u0111\u1eb7c nh\u1ea5t theo ph\u01b0\u1eddng trong H\u1ea3i Ch\u00e2u")
    ).toEqual(expect.arrayContaining(["restaurant"]));
  });

  it("answers highest-density cafe queries by ward", async () => {
    const { service } = serviceWithSqlite();
    const result = await service.semanticSearch("phuong nao nhieu quan ca phe nhat o Hai Chau");
    expect(result.answer).toMatchObject({
      type: "poi-density",
      count: 226,
      filters: { district: "H\u1ea3i Ch\u00e2u", category: "qu\u00e1n c\u00e0 ph\u00ea" }
    });
    expect(result.map?.regions[0]).toMatchObject({ ward: "H\u1ea3i Ch\u00e2u I", count: 226 });
  });

  it("answers count and list queries with canonical ward matching", async () => {
    const { service } = serviceWithSqlite();
    await expect(service.semanticSearch("co bao nhieu khach san o phuong Hai Chau I")).resolves.toMatchObject({
      answer: { type: "poi-count", count: 162, filters: { ward: "H\u1ea3i Ch\u00e2u I" } }
    });
    await expect(service.semanticSearch("liet ke quan ca phe o Thach Thang")).resolves.toMatchObject({
      answer: { type: "poi-list", count: 1, filters: { ward: "Th\u1ea1ch Thang" } },
      items: [expect.objectContaining({ name: "Highlands Coffee", propertyType: "Qu\u00e1n c\u00e0 ph\u00ea" })]
    });
  });

  it("treats concise category and district searches as list queries", async () => {
    const { service, sqlite } = serviceWithSqlite();

    const result = await service.semanticSearch("cafe o Hai Chau");

    expect(result).toMatchObject({
      answer: {
        type: "poi-list",
        count: 1,
        filters: { district: "H\u1ea3i Ch\u00e2u", category: "qu\u00e1n c\u00e0 ph\u00ea" }
      },
      items: [
        expect.objectContaining({
          name: "Highlands Coffee",
          district: "H\u1ea3i Ch\u00e2u"
        })
      ]
    });
    expect(sqlite.all).toHaveBeenLastCalledWith(
      expect.stringContaining("FROM \"Place\""),
      "cafe",
      "coffee_shop",
      "%\"cafe\"%",
      "%\"coffee_shop\"%",
      "H\u1ea3i Ch\u00e2u",
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
    const service = new PoiService(prisma as never, new CategoryMapper());

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
