import { NextResponse } from "next/server";
import { cjCategories, cjEnabled } from "@/lib/cj";

/** Lists CJ's categories, so the catalog import can pick giftable ones. /api/cj/categories?token=IMPORT_TOKEN */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!process.env.IMPORT_TOKEN || token !== process.env.IMPORT_TOKEN) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  if (!cjEnabled()) return NextResponse.json({ error: "CJ_API_KEY is not set" }, { status: 400 });
  const cats = await cjCategories();
  return new NextResponse(cats.map((c) => `${c.id}\t${c.first} > ${c.second} > ${c.name}`).join("\n"), { headers: { "content-type": "text/plain" } });
}
