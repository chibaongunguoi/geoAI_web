import "./globals.css";

export const metadata = {
  title: "GeoAI Satellite Analyzer",
  description: "Phân tích ảnh vệ tinh theo vùng chọn trên bản đồ tương tác.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
