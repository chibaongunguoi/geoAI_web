import {
  densityRegions,
  densitySummaryRows,
  hasDensityResult,
  propertySearchAnswerText
} from "./property-search";

describe("property search helpers", () => {
  it("formats density answers and rows for the sidebar and map", () => {
    const result = {
      answer: {
        text: "Vùng dày đặc nhất có 81 tòa nhà tại Hòa Khánh Bắc."
      },
      map: {
        type: "property-density",
        regions: [
          {
            id: "density-1",
            label: "Hòa Khánh Bắc, Liên Chiểu",
            count: 81
          }
        ]
      }
    };

    expect(propertySearchAnswerText(result)).toBe(
      "Vùng dày đặc nhất có 81 tòa nhà tại Hòa Khánh Bắc."
    );
    expect(hasDensityResult(result)).toBe(true);
    expect(densityRegions(result)).toHaveLength(1);
    expect(densitySummaryRows(result)).toEqual([
      {
        id: "density-1",
        label: "Hòa Khánh Bắc, Liên Chiểu",
        count: 81
      }
    ]);
  });
});
