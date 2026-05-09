import { act, renderHook, waitFor } from "@testing-library/react";
import useSearchHistory from "./useSearchHistory";

function memoryStorage(initialValue) {
  const values = new Map(initialValue ? [["geoai-search-history", initialValue]] : []);

  return {
    getItem: jest.fn((key) => values.get(key) || null),
    setItem: jest.fn((key, value) => values.set(key, value))
  };
}

describe("useSearchHistory", () => {
  it("stores typed natural-language question history", async () => {
    const storage = memoryStorage();
    const { result } = renderHook(() => useSearchHistory(storage));

    act(() => {
      result.current.addSearch("Có bao nhiêu nhà ở phường Hòa Khánh Bắc?");
    });

    await waitFor(() => {
      expect(result.current.history[0]).toEqual(
        expect.objectContaining({
          text: "Có bao nhiêu nhà ở phường Hòa Khánh Bắc?",
          type: "nl-question"
        })
      );
    });
    expect(storage.setItem).toHaveBeenCalledWith(
      "geoai-search-history",
      expect.stringContaining("nl-question")
    );
  });

  it("normalizes legacy string history entries", async () => {
    const storage = memoryStorage(JSON.stringify(["Nguyen Luong Bang"]));
    const { result } = renderHook(() => useSearchHistory(storage));

    await waitFor(() => {
      expect(result.current.history).toEqual([
        expect.objectContaining({
          text: "Nguyen Luong Bang",
          type: "keyword"
        })
      ]);
    });
  });
});
