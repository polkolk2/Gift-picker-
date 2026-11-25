"use client";
import { useState } from "react";
import { claimGift } from "./actions";

type Opt = { sku: string; name: string; emoji: string | null; description: string | null };

export default function ClaimForm({ token, current, swaps }: { token: string; current: Opt; swaps: Opt[] }) {
  const [sku, setSku] = useState(current.sku);
  const [showSwaps, setShowSwaps] = useState(false);
  const chosen = sku === current.sku ? current : swaps.find((s) => s.sku === sku) ?? current;

  return (
    <form action={claimGift} className="stack">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="sku" value={sku} />
      <div className="card">
        <span className="muted">You&rsquo;re getting</span>
        <strong>{chosen.emoji ? `${chosen.emoji} ` : ""}{chosen.name}</strong>
        {chosen.description && <span className="muted">{chosen.description}</span>}
        {swaps.length > 0 && (
          <button type="button" className="btn ghost" onClick={() => setShowSwaps(!showSwaps)}>
            {showSwaps ? "Keep this one" : "Swap for something else"}
          </button>
        )}
      </div>
      {showSwaps && (
        <div className="grid">
          {[current, ...swaps].map((s) => (
            <button key={s.sku} type="button" className={`swap ${s.sku === sku ? "on" : ""}`} aria-pressed={s.sku === sku} onClick={() => setSku(s.sku)}>
              {s.emoji && <span className="emoji" aria-hidden>{s.emoji}</span>}
              <strong>{s.name}</strong>
              {s.description && <span className="muted">{s.description}</span>}
            </button>
          ))}
        </div>
      )}
      <label>Your name<input name="name" required autoComplete="name" /></label>
      <label>Street address<input name="line1" required autoComplete="address-line1" /></label>
      <label>Apartment, suite (optional)<input name="line2" autoComplete="address-line2" /></label>
      <div className="row">
        <label style={{ flex: 2 }}>City<input name="city" required autoComplete="address-level2" /></label>
        <label style={{ flex: 1 }}>State<input name="state" required maxLength={2} autoComplete="address-level1" /></label>
        <label style={{ flex: 1 }}>ZIP<input name="postal_code" required inputMode="numeric" autoComplete="postal-code" /></label>
      </div>
      <button className="btn" type="submit">Send it to me</button>
    </form>
  );
}
