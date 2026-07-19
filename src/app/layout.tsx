import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title:"Kiro · AI Chess Coach", description:"Learn chess by playing with a beginner-friendly coach" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html suppressHydrationWarning><body>{children}</body></html>; }
