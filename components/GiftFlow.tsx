"use client";
import { useState } from "react";
import { OCCASIONS, PRICE_BANDS, STYLES, type PublicPick } from "@/lib/types";
import { AMAZON_REL, ASSOCIATE_STATEMENT } from "@/lib/amazon";
import type { AmazonIdea } from "@/lib/amazon-ideas";

type Question = { q: string; options: string[] };
type Delivery = "text" | "link" | "ship";
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const OCC_ICON: Record<string, string> = {
  birthday: "🎂", holiday: "🎄", graduation: "🎓", wedding: "💍", "new baby": "🍼", anniversary: "💞",
  "work anniversary": "🏆", "thank you": "🙏", "get well": "🌷", housewarming: "🏡",
};
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * The gift finder. Pick the occasion, a price and up to three styles, then:
 * round 1 shows three gifts, round 2 three more, round 3 asks a few questions
 * and picks again. Used on a saved person's page (recipientId) and on the
 * quick finder at /find (no saved person; signedIn decides if checkout opens).
 * Prices are what the giver pays: one number, shipping included, no fees.
 */
export default function GiftFlow(props: {
  recipientId?: string; name?: string; email?: string | null; defaultOccasion?: string; signedIn?: boolean;
  perkPercent?: number; // set when the family discount applies to this giver's next gift
  budgetLabel?: string; // "Company budget" for a business's employees
}) {
  const quick = !props.recipientId;
  const [name, setName] = useState(props.name ?? "");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("any");
  const [occasion, setOccasion] = useState(props.defaultOccasion ?? "birthday");
  const [band, setBand] = useState(quick ? 1 : -1); // -1 = use the person's saved budget
  const [styles, setStyles] = useState<string[]>([]);
  const [round, setRound] = useState(0);
  const [picks, setPicks] = useState<PublicPick[]>([]);
  const [amazon, setAmazon] = useState<AmazonIdea[]>([]);
  const [shown, setShown] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState("");
  const [delivery, setDelivery] = useState<Delivery>("text");
  const [toEmail, setToEmail] = useState(props.email ?? "");
  const [toPhone, setToPhone] = useState("");
  const [message, setMessage] = useState("");
  const who = name.trim() || "them";
  const perk = props.perkPercent ?? 0;
  const pay = (c: number) => (perk ? Math.round((c * (100 - perk)) / 100) : c);

  function finderBody(extra: object = {}) {
    const b = band >= 0 ? PRICE_BANDS[band] : null;
    return {
      recipientId: props.recipientId, occasion, styles,
      budget: b ? { min: b.min, max: b.max } : undefined,
      ...(quick ? { name, age: age || undefined, sex } : {}),
      exclude: shown, ...extra,
    };
  }
  async function post(path: string, body: object) {
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return res.json();
  }
  function toggleStyle(s: string) {
    setStyles((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : cur.length < 3 ? [...cur, s] : cur));
  }
  function restart() { setRound(0); setPicks([]); setAmazon([]); setShown([]); setQuestions([]); setAnswers({}); }

  async function nextRound() {
    if (round >= 2) {
      setBusy("Thinking of a few questions...");
      const { questions } = await post("/api/questions", finderBody());
      setQuestions(questions ?? []); setPicks([]); setAmazon([]); setRound(3); setBusy("");
      return;
    }
    setBusy("Finding ideas...");
    const { picks: p, amazon: a } = await post("/api/picks", finderBody());
    setPicks(p ?? []); setAmazon(a ?? []); setShown([...shown, ...(p ?? []).map((x: PublicPick) => x.sku)]); setRound(round + 1); setBusy("");
  }
  async function finish() {
    setBusy("Picking the best three...");
    const qa = questions.map((q, i) => ({ q: q.q, a: answers[i] }));
    const { picks: p, amazon: a } = await post("/api/picks", finderBody({ answers: qa }));
    setPicks(p ?? []); setAmazon(a ?? []); setQuestions([]); setBusy("");
  }
  async function buy(sku: string) {
    if (!props.signedIn) { window.location.href = "/login"; return; }
    if (quick && !name.trim()) { setBusy("Add their name first."); return; }
    if (delivery === "text" && toPhone.replace(/\D/g, "").length < 10) { setBusy("Add their phone number first."); return; }
    setBusy("Opening checkout...");
    const { url, error } = await post("/api/checkout", {
      recipientId: props.recipientId, recipientName: name, sku, delivery, recipientEmail: toEmail, recipientPhone: toPhone, message,
    });
    if (url) window.location.href = url; else setBusy(error ?? "Checkout didn't open.");
  }

  const option = (val: Delivery, title: string, sub: string) => (
    <label className={`pick-row ${delivery === val ? "on" : ""}`}>
      <input type="radio" name="delivery" checked={delivery === val} onChange={() => setDelivery(val)} />
      <span><strong>{title}</strong><span className="muted">{sub}</span></span>
    </label>
  );

  return (
    <section className="panel stack">
      <h2>{quick ? "Find a gift" : `Find a gift for ${props.name}`}</h2>

      {quick && (
        <div className="row">
          <label style={{ flex: 2 }}>Who&rsquo;s it for?<input value={name} placeholder="Their name" onChange={(e) => setName(e.target.value)} /></label>
          <label style={{ flex: 1 }}>Age<input inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))} /></label>
          <label style={{ flex: 1 }}>For<select value={sex} onChange={(e) => setSex(e.target.value)}><option value="any">Anyone</option><option value="f">Her</option><option value="m">Him</option></select></label>
        </div>
      )}

      <div className="stack tight">
        <span className="step">1 · Occasion</span>
        <div className="chips">
          {OCCASIONS.map((o) => (
            <button key={o} type="button" className={`chip ${occasion === o ? "on" : ""}`} aria-pressed={occasion === o} onClick={() => { setOccasion(o); restart(); }}>
              <span aria-hidden>{OCC_ICON[o] ?? "🎁"}</span> {cap(o)}
            </button>
          ))}
        </div>
      </div>

      <div className="stack tight">
        <span className="step">2 · Price, shipping included</span>
        <div className="chips">
          {!quick && <button type="button" className={`chip ${band === -1 ? "on" : ""}`} onClick={() => { setBand(-1); restart(); }}>{props.budgetLabel ?? "Their usual budget"}</button>}
          {PRICE_BANDS.map((b, i) => (
            <button key={b.label} type="button" className={`chip ${band === i ? "on" : ""}`} onClick={() => { setBand(i); restart(); }}>{b.label}</button>
          ))}
        </div>
      </div>

      <div className="stack tight">
        <span className="step">3 · What kind of gift? Up to 3, or none</span>
        <div className="chips">
          {STYLES.map((s) => (
            <button key={s} type="button" className={`chip ${styles.includes(s) ? "on" : ""}`} aria-pressed={styles.includes(s)} onClick={() => { toggleStyle(s); restart(); }}>{cap(s)}</button>
          ))}
        </div>
      </div>

      {perk > 0 && <p className="perk-note">Your {perk}% family discount comes off your next gift.</p>}

      {round === 0 && <button className="btn big" onClick={nextRound}>Show me 3 ideas</button>}

      {picks.length > 0 && (
        <div className="grid">
          {picks.map((p, i) => (
            <article key={p.sku} className="gift">
              <div className="thumb" aria-hidden>
                <span>{p.emoji || "🎁"}</span>
                {round === 1 && i === 0 && <span className="badge">Best match</span>}
              </div>
              <h3>{p.name}</h3>
              {p.description && <p className="muted">{p.description}</p>}
              <p className="why">{p.why}</p>
              <div className="price">
                {perk > 0 ? <span><s className="muted">{money(p.payCents)}</s> {money(pay(p.payCents))}</span> : <span>{money(p.payCents)}</span>}
                <small className="muted">Shipping included, no fees</small>
              </div>
              <button className="btn" onClick={() => buy(p.sku)}>{props.signedIn ? "Send this" : "Sign in to send"}</button>
            </article>
          ))}
        </div>
      )}

      {picks.length > 0 && amazon.length > 0 && (
        <section className="amazon stack tight" aria-labelledby="amazon-ideas">
          <div className="amazon-banner">
            <h3 id="amazon-ideas">More gift ideas on Amazon</h3>
            <span className="muted">Opens Amazon in a new tab, where you&rsquo;ll see prices. Paid links.</span>
          </div>
          <ul className="amazon-list">
            {amazon.map((x) => (
              <li key={x.label}>
                <a href={x.url} target="_blank" rel={AMAZON_REL}><span aria-hidden>{x.emoji}</span> {x.label}</a>
              </li>
            ))}
          </ul>
          <small className="muted">{ASSOCIATE_STATEMENT}</small>
        </section>
      )}

      {round > 0 && round < 3 && picks.length > 0 && (
        <button className="btn ghost" onClick={nextRound}>{round === 1 ? "None of these. Show 3 more" : "Still not right. Ask me a few questions"}</button>
      )}

      {questions.map((q, i) => (
        <div key={i} className="stack tight">
          <strong>{q.q}</strong>
          <div className="chips">
            {q.options.map((o) => (
              <button key={o} className={`chip ${answers[i] === o ? "on" : ""}`} onClick={() => setAnswers({ ...answers, [i]: o })}>{o}</button>
            ))}
          </div>
        </div>
      ))}
      {questions.length > 0 && (
        <button className="btn" disabled={Object.keys(answers).length < questions.length} onClick={finish}>Find the best gift</button>
      )}

      {picks.length > 0 && props.signedIn && (
        <div className="card stack">
          <strong>How should it get to {who}?</strong>
          {option("text", "Text them a gift link", "They add their own address and can swap it for anything worth the same or less.")}
          {delivery === "text" && (
            <input type="tel" inputMode="tel" autoComplete="off" placeholder="Their phone number" value={toPhone} onChange={(e) => setToPhone(e.target.value)} />
          )}
          {option("link", "Email them a gift link", "Same as a text, sent to their inbox.")}
          {delivery === "link" && (
            <input type="email" placeholder="Their email (or share the link yourself)" value={toEmail} onChange={(e) => setToEmail(e.target.value)} />
          )}
          {option("ship", "Ship to an address", "You type their address at checkout.")}
          <input placeholder="Gift note (optional)" maxLength={300} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
      )}
      {busy && <p className="muted" role="status">{busy}</p>}
    </section>
  );
}
