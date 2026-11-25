"use client";
import { useEffect, useRef, useState } from "react";
import { OCCASIONS, PRICE_BANDS, STYLES, type PublicPick } from "@/lib/types";
import { AMAZON_REL, ASSOCIATE_STATEMENT } from "@/lib/amazon";
import type { AmazonIdea } from "@/lib/amazon-ideas";

type Question = { q: string; options: string[] };
type Delivery = "text" | "link" | "ship";
const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
// Age choices: each year through 21, then a range (sent as its middle age).
const AGES: { label: string; value: string }[] = [
  { label: "Any age", value: "" }, { label: "Under 1", value: "0" },
  ...Array.from({ length: 21 }, (_, i) => ({ label: String(i + 1), value: String(i + 1) })),
  { label: "22 to 29", value: "25" }, { label: "30s", value: "35" }, { label: "40s", value: "45" },
  { label: "50s", value: "55" }, { label: "60s", value: "65" }, { label: "70+", value: "75" },
];

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
  // Once ideas are showing, any change to age, "for", occasion, price or kind
  // of gift fetches fresh ideas right away (the newest request wins).
  const searched = useRef(false);
  const reqId = useRef(0);
  async function refresh() {
    const id = ++reqId.current;
    setBusy("Updating ideas...");
    const { picks: p, amazon: a } = await post("/api/picks", finderBody({ exclude: [] }));
    if (id !== reqId.current) return;
    setPicks(p ?? []); setAmazon(a ?? []); setShown((p ?? []).map((x: PublicPick) => x.sku));
    setQuestions([]); setAnswers({}); setRound(1); setBusy("");
  }
  const filters = [age, sex, occasion, band, styles.join(",")].join("|");
  useEffect(() => {
    if (!searched.current) return;
    const t = setTimeout(refresh, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function nextRound() {
    if (round >= 2) {
      setBusy("Thinking of a few questions...");
      const { questions } = await post("/api/questions", finderBody());
      setQuestions(questions ?? []); setPicks([]); setAmazon([]); setRound(3); setBusy("");
      return;
    }
    setBusy("Finding ideas...");
    searched.current = true;
    const id = ++reqId.current;
    const { picks: p, amazon: a } = await post("/api/picks", finderBody());
    if (id !== reqId.current) return;
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
      <h2>{quick ? "About them" : `A gift for ${props.name}`}</h2>

      {quick && (
        <div className="row">
          <label style={{ flex: 2 }}>Who&rsquo;s it for?<input value={name} placeholder="Their name" onChange={(e) => setName(e.target.value)} /></label>
          <label style={{ flex: 1 }}>Age<select value={age} onChange={(e) => setAge(e.target.value)}>{AGES.map((a) => <option key={a.label} value={a.value}>{a.label}</option>)}</select></label>
          <label style={{ flex: 1 }}>For<select value={sex} onChange={(e) => setSex(e.target.value)}><option value="any">Anyone</option><option value="f">Her</option><option value="m">Him</option></select></label>
        </div>
      )}

      <div className="stack tight">
        <span className="step">01 · The occasion</span>
        <div className="chips">
          {OCCASIONS.map((o) => (
            <button key={o} type="button" className={`chip ${occasion === o ? "on" : ""}`} aria-pressed={occasion === o} onClick={() => { setOccasion(o); }}>
              {cap(o)}
            </button>
          ))}
        </div>
      </div>

      <div className="stack tight">
        <span className="step">02 · Your budget, shipping included</span>
        <div className="chips">
          {!quick && <button type="button" className={`chip ${band === -1 ? "on" : ""}`} onClick={() => { setBand(-1); }}>{props.budgetLabel ?? "Their usual budget"}</button>}
          {PRICE_BANDS.map((b, i) => (
            <button key={b.label} type="button" className={`chip ${band === i ? "on" : ""}`} onClick={() => { setBand(i); }}>{b.label}</button>
          ))}
        </div>
      </div>

      <div className="stack tight">
        <span className="step">03 · Their style, up to three</span>
        <div className="chips">
          {STYLES.map((s) => (
            <button key={s} type="button" className={`chip ${styles.includes(s) ? "on" : ""}`} aria-pressed={styles.includes(s)} onClick={() => { toggleStyle(s); }}>{cap(s)}</button>
          ))}
        </div>
      </div>

      {perk > 0 && <p className="perk-note">Your {perk}% family discount comes off your next gift.</p>}

      {round === 0 && <button className="btn big" onClick={nextRound}>Show me three gifts</button>}

      {picks.length > 0 && (
        <div className="grid">
          {picks.map((p, i) => (
            <article key={p.sku} className="gift">
              <div className="thumb" aria-hidden>
                {p.image ? <img src={p.image} alt="" loading="lazy" /> : <span>{p.emoji || ""}</span>}
                {round === 1 && i === 0 && <span className="badge">Best match</span>}
              </div>
              <h3>{p.name}</h3>
              {p.description && <p className="muted">{p.description}</p>}
              <p className="why">{p.why}</p>
              <div className="price">
                {perk > 0 ? <span><s className="muted">{money(p.payCents)}</s> {money(pay(p.payCents))}</span> : <span>{money(p.payCents)}</span>}
                <small className="free-ship">Free shipping</small>
              </div>
              <button className="btn" onClick={() => buy(p.sku)}>{props.signedIn ? "Send this" : "Sign in to send"}</button>
            </article>
          ))}
        </div>
      )}

      {picks.length > 0 && amazon.length > 0 && (
        <section className="amazon stack tight" aria-labelledby="amazon-ideas">
          <div className="amazon-banner">
            <h3 id="amazon-ideas">Also worth a look</h3>
            <span className="muted">Our picks on Amazon. Opens in a new tab. Paid links.</span>
          </div>
          {amazon.some((x) => x.kind === "item") && (
            <ul className="amazon-list">
              {amazon.filter((x) => x.kind === "item").map((x) => (
                <li key={x.url} className={x.embed ? "amazon-embed" : x.image ? "amazon-pic" : undefined}>
                  {x.embed
                    ? <iframe src={x.embed} title={x.label} width={120} height={240} loading="lazy" sandbox="allow-popups allow-scripts allow-same-origin allow-popups-to-escape-sandbox" style={{ border: 0 }} />
                    : <a href={x.url} target="_blank" rel={AMAZON_REL}>{x.image && <img src={x.image} alt="" width={80} height={80} loading="lazy" />}<span>{x.label}</span></a>}
                </li>
              ))}
            </ul>
          )}
          {amazon.some((x) => x.kind === "item") && <span className="step" style={{ marginTop: 10 }}>Or browse</span>}
          <ul className="amazon-list">
            {amazon.filter((x) => x.kind !== "item").map((x) => (
              <li key={x.url}>
                <a href={x.url} target="_blank" rel={AMAZON_REL}><span>{x.label}</span></a>
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
