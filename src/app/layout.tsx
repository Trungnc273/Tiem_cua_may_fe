import type { Metadata, Viewport } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: { default: "Midora", template: "%s | Midora" },
  description: "Khám phá bộ sưu tập thời trang tại Midora.",
  applicationName: "Midora",
  openGraph: { siteName: "Midora", title: "Midora", description: "Khám phá bộ sưu tập thời trang tại Midora.", locale: "vi_VN", type: "website" },
  icons: { icon: "/brand/logo.png", apple: "/brand/logo.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
