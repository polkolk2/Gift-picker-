import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";

export const revalidate = 3600;

/** Four product photos for the hero, from the live catalog. */
async function heroPhotos(): Promise<{ src: string; name: string }[]> {
  try {
    const { data } = await supabaseAdmin().from("products").select("name, image_url, popularity")
      .eq("active", true).not("image_url", "is", null).order("popularity", { ascending: false }).limit(4);
    return (data ?? []).map((r) => ({ src: r.image_url as string, name: r.name as string }));
  } catch { return []; }
}

export default async function Home() {
  const photos = await heroPhotos();
  return (
    <main className="stack" style={{ gap: 56 }}>
      <section className="hero">
        <div className="stack" style={{ gap: 20 }}>
          <span className="kicker">Gifts, thoughtfully chosen</span>
          <h1>The right gift for the people you love.</h1>
          <p className="muted">
            Tell us who it&rsquo;s for, the occasion and your budget. We suggest three gifts worth giving,
            with shipping included in one simple price.
          </p>
          <div className="row" style={{ gap: 12 }}>
            <Link className="btn big" href="/find">Find a gift</Link>
            <Link className="btn ghost big" href="/login">Save my people</Link>
          </div>
          <ul className="trust">
            <li>Shipping included</li>
            <li>Send by text, they add the address</li>
            <li>Secure checkout</li>
          </ul>
        </div>
        {photos.length >= 2 && (
          <div className="hero-art" aria-hidden>
            {photos.map((p) => <figure key={p.src}><img src={p.src} alt="" loading="eager" /></figure>)}
          </div>
        )}
      </section>

      <section className="stack" style={{ gap: 20 }}>
        <span className="eyebrow">How it works</span>
        <ol className="how">
          <li><h3>Tell us about them</h3><span className="muted">Their age, the occasion, your budget and the kind of gift they&rsquo;d love.</span></li>
          <li><h3>Choose from three</h3><span className="muted">A short, considered list. Not quite right? We&rsquo;ll show three more.</span></li>
          <li><h3>We send it</h3><span className="muted">To their door, or by a link where they add their address and can swap.</span></li>
        </ol>
      </section>

      <section className="band row" style={{ justifyContent: "space-between", gap: 20 }}>
        <div className="stack tight">
          <h2>Gifts for your team</h2>
          <span className="muted">Add your team once, and never miss a birthday or work anniversary.</span>
        </div>
        <Link className="btn ghost" href="/business">For businesses</Link>
      </section>
    </main>
  );
}
