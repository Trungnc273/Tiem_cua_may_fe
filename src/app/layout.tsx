import type { Metadata, Viewport } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Tiệm Của Mây | Mặc xinh như mây",
  description: "Những bộ đồ xinh xắn cho ngày yêu đời hơn.",
  icons: { icon: "/brand/logo.jpg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
