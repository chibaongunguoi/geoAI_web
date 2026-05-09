import html2canvas from "html2canvas";

export async function captureElementPng(element, options = {}) {
  if (!element) {
    throw new Error("Map element is not available.");
  }

  try {
    const canvas = await html2canvas(element, {
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      scale: options.scale || 2,
    });
    return canvas.toDataURL("image/png");
  } catch {
    throw new Error("Map capture failed.");
  }
}

export function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function exportPrintablePdf({ imageDataUrl, metadata, openWindow = window.open }) {
  if (!imageDataUrl) {
    throw new Error("Export image is not available.");
  }

  const printWindow = openWindow("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    throw new Error("Print window was blocked.");
  }

  const title = metadata?.title || "GeoAI Map Export";
  const organization = metadata?.organization || "";
  const orientation = metadata?.orientation || "landscape";
  const paperSize = metadata?.paperSize || "A4";
  const timestamp = metadata?.includeTimestamp === false ? "" : new Date().toLocaleString();
  const watermark = metadata?.includeWatermark === false ? "" : "<footer>GeoAI</footer>";

  printWindow.document.write(`<!doctype html>
<html>
<head>
  <title>${title}</title>
  <style>
    @page { size: ${paperSize} ${orientation}; margin: 12mm; }
    body { margin: 0; font-family: Arial, sans-serif; color: #111827; }
    header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
    h1 { margin: 0; font-size: 18px; }
    p { margin: 4px 0 0; color: #4b5563; font-size: 11px; }
    img { width: 100%; max-height: 86vh; object-fit: contain; border: 1px solid #e5e7eb; }
    footer { margin-top: 8px; text-align: right; color: #6b7280; font-size: 10px; }
  </style>
</head>
<body>
  <header>
    <div><h1>${title}</h1><p>${organization}</p></div>
    <p>${timestamp}</p>
  </header>
  <img src="${imageDataUrl}" alt="Map export" />
  ${watermark}
</body>
</html>`);
  printWindow.document.close();
  printWindow.focus?.();
  printWindow.print?.();
  return true;
}
