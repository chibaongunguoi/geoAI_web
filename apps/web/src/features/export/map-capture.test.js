import { captureElementPng, exportPrintablePdf } from "./map-capture";

jest.mock("html2canvas", () => jest.fn());

import html2canvas from "html2canvas";

describe("map-capture", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("captures an element as PNG data URL", async () => {
    html2canvas.mockResolvedValue({
      toDataURL: jest.fn(() => "data:image/png;base64,abc"),
    });

    await expect(captureElementPng(document.createElement("div"))).resolves.toBe("data:image/png;base64,abc");
  });

  it("throws controlled capture errors", async () => {
    await expect(captureElementPng(null)).rejects.toThrow("Map element is not available.");
    html2canvas.mockRejectedValue(new Error("blocked"));
    await expect(captureElementPng(document.createElement("div"))).rejects.toThrow("Map capture failed.");
  });

  it("opens a printable PDF window", () => {
    const print = jest.fn();
    const close = jest.fn();
    const write = jest.fn();
    const mockWindow = {
      document: { write, close },
      focus: jest.fn(),
      print,
    };
    const opener = jest.fn(() => mockWindow);

    expect(
      exportPrintablePdf({
        imageDataUrl: "data:image/png;base64,abc",
        metadata: { title: "Map", orientation: "landscape", paperSize: "A4" },
        openWindow: opener,
      }),
    ).toBe(true);
    expect(write).toHaveBeenCalled();
    expect(print).toHaveBeenCalled();
  });
});
