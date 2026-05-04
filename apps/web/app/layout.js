import "./globals.css";

export const metadata = {
  title: "GeoAI RBAC Platform",
  description: "GeoAI map analysis with role-based access control."
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
