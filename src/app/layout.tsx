import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title:"棋路 · 国际象棋学习陪练", description:"通过对局、规则和本地棋力引擎学习国际象棋" };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html suppressHydrationWarning><body>{children}</body></html>; }
