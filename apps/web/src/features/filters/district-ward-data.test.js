import {
  DISTRICTS,
  WARDS_BY_DISTRICT,
  getWardsForDistrict,
} from "./district-ward-data";

describe("district-ward-data", () => {
  describe("DISTRICTS", () => {
    it("contains exactly 7 districts", () => {
      expect(DISTRICTS).toHaveLength(7);
    });

    it("includes all required Đà Nẵng districts", () => {
      const expected = [
        "Hải Châu",
        "Thanh Khê",
        "Sơn Trà",
        "Ngũ Hành Sơn",
        "Liên Chiểu",
        "Cẩm Lệ",
        "Hòa Vang",
      ];
      for (const district of expected) {
        expect(DISTRICTS).toContain(district);
      }
    });
  });

  describe("WARDS_BY_DISTRICT", () => {
    it("has an entry for each district", () => {
      for (const district of DISTRICTS) {
        expect(WARDS_BY_DISTRICT).toHaveProperty(district);
        expect(WARDS_BY_DISTRICT[district].length).toBeGreaterThan(0);
      }
    });

    it("wards are sorted alphabetically using Vietnamese locale", () => {
      const viCollator = new Intl.Collator("vi", { sensitivity: "base" });
      for (const district of DISTRICTS) {
        const wards = WARDS_BY_DISTRICT[district];
        const sorted = [...wards].sort(viCollator.compare);
        expect(wards).toEqual(sorted);
      }
    });

    it("Ngũ Hành Sơn has exactly 4 wards", () => {
      expect(WARDS_BY_DISTRICT["Ngũ Hành Sơn"]).toHaveLength(4);
    });

    it("Hải Châu has 13 wards", () => {
      expect(WARDS_BY_DISTRICT["Hải Châu"]).toHaveLength(13);
    });
  });

  describe("getWardsForDistrict", () => {
    it("returns wards for a valid district", () => {
      const wards = getWardsForDistrict("Sơn Trà");
      expect(wards.length).toBeGreaterThan(0);
      expect(wards).toContain("An Hải Bắc");
    });

    it("returns empty array for null", () => {
      expect(getWardsForDistrict(null)).toEqual([]);
    });

    it("returns empty array for undefined", () => {
      expect(getWardsForDistrict(undefined)).toEqual([]);
    });

    it("returns empty array for empty string", () => {
      expect(getWardsForDistrict("")).toEqual([]);
    });

    it("returns empty array for unknown district", () => {
      expect(getWardsForDistrict("Unknown District")).toEqual([]);
    });

    it("returns the same reference as WARDS_BY_DISTRICT", () => {
      for (const district of DISTRICTS) {
        expect(getWardsForDistrict(district)).toBe(
          WARDS_BY_DISTRICT[district]
        );
      }
    });
  });
});
