"use client";
import { useState } from "react";

// Lets the giver text or share the gift link themselves. With a phone number
// ("text" delivery), the first button opens their own Messages app with the
// link filled in, so the text comes from them. Sending texts from the app
// itself would need an SMS service such as Twilio.
export default function CopyLink({ url, phone, name }: { url: string; phone?: string | null; name?: string | null }) {
  const [done, setDone] = useState(false);
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: "A gift for you", url }); return; } catch { /* fall back to copy */ }
    }
    await navigator.clipboard.writeText(url);
    setDone(true);
  }
  const body = `${name ? `Hi ${name}, ` : ""}I sent you a gift! Open it here, add your address, or swap it for something else: ${url}`;
  return (
    <div className="row">
      {phone && <a className="btn" href={`sms:+1${phone}?&body=${encodeURIComponent(body)}`}>Text the gift link</a>}
      <button className="btn ghost" type="button" onClick={share}>{done ? "Link copied" : phone ? "Copy or share" : "Share the gift link"}</button>
    </div>
  );
}
