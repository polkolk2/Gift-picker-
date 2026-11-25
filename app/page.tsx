import Link from "next/link";

export default function Home() {
  return (
    <main className="stack" style={{ gap: 32 }}>
      <section className="hero">
        <div className="stack">
          <h1>The right gift, picked in a minute.</h1>
          <p className="muted">
            Tell us the occasion, a price and what they&rsquo;re into. We show three hand-picked ideas, then three more,
            then ask a few quick questions if none fit. Save your people and we&rsquo;ll remind you before every big day.
          </p>
          <div className="row">
            <Link className="btn big" href="/find">Find a gift now</Link>
            <Link className="btn ghost" href="/login">Save my people</Link>
          </div>
          <span className="muted" style={{ fontSize: 13 }}>No sign-up needed to see ideas.</span>
          <ul className="trust">
            <li>One price, shipping included, no fees</li>
            <li>No address? Text a link they can swap</li>
            <li>Secure checkout by Stripe</li>
          </ul>
        </div>
        <div className="hero-art" aria-hidden>🎁</div>
      </section>

      <section className="stack">
        <h2>How it works</h2>
        <ol className="how">
          <li><h3>Pick the occasion</h3><span className="muted">Birthday, graduation, new baby and more, then a price and a style.</span></li>
          <li><h3>Choose from 3 ideas</h3><span className="muted">Not right? See 3 more, then answer a few quick questions.</span></li>
          <li><h3>We send it</h3><span className="muted">To their address, or by a text or email link where they add it and can swap.</span></li>
        </ol>
      </section>

      <section className="card row" style={{ justifyContent: "space-between" }}>
        <div className="stack tight">
          <h2>Gifts for your team</h2>
          <span className="muted">Upload employees once and never miss a birthday or work anniversary.</span>
        </div>
        <Link className="btn ghost" href="/business">For businesses</Link>
      </section>
    </main>
  );
}
