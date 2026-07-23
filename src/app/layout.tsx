import "./globals.css";
import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  category: "education",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html suppressHydrationWarning><body>{children}</body></html>;
}
