import "./globals.css";
import Link from "next/link";
import { Fraunces, Inter } from "next/font/google";
import { ASSOCIATE_STATEMENT } from "@/lib/amazon";

const display = Fraunces({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], variable: "--font-display" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

export const metadata = {
  title: "Gift4Me",
  description: "Thoughtful gifts, chosen for the person. Shipping included.",
  applicationName: "Gift4Me",
  appleWebApp: { capable: true, title: "Gift4Me", statusBarStyle: "default" as const },
};
export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF8F4" },
    { media: "(prefers-color-scheme: dark)", color: "#12110F" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <header className="top">
          <Link href="/" className="brand" aria-label="Gift4Me home">Gift<em>4</em>Me</Link>
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
