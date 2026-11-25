import "./globals.css";
import Link from "next/link";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { ASSOCIATE_STATEMENT } from "@/lib/amazon";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

export const metadata = { title: "Gift Picker", description: "Never miss a birthday. Pick and send the right gift in a few taps." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <header className="top">
          <Link href="/" className="brand"><span className="brand-mark" aria-hidden>🎁</span>Gift Picker</Link>
          <nav><Link href="/find">Find a gift</Link><Link href="/people">My people</Link><Link href="/business">For teams</Link><Link href="/orders">Orders</Link></nav>
        </header>
        {children}
        <footer className="site-foot">
          <span>{ASSOCIATE_STATEMENT}</span>
          <Link href="/disclosure">Affiliate disclosure</Link>
          <Link href="/privacy">Privacy</Link>
        </footer>
      </body>
    </html>
  );
}
