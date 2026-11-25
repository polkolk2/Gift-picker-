"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Provider = "google" | "facebook" | "apple";

export default function LoginButtons({ gift }: { gift?: string }) {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback${gift ? `?gift=${encodeURIComponent(gift)}` : ""}` : undefined;

  async function social(provider: Provider) {
    await supabaseBrowser().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        // Google: also ask to read contacts so birthdays can be imported in one tap.
        scopes: provider === "google" ? "https://www.googleapis.com/auth/contacts.readonly" : undefined,
      },
    });
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabaseBrowser().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
    setNote(error ? "That didn't work. Check the address and try again." : "Check your email for a sign-in link.");
  }

  return (
    <div className="stack">
      <button className="btn" onClick={() => social("google")}>Continue with Google</button>
      <button className="btn" onClick={() => social("facebook")}>Continue with Facebook</button>
      <button className="btn" onClick={() => social("apple")}>Continue with Apple</button>
      <form onSubmit={magicLink} className="row">
        <input type="email" required placeholder="or your email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="btn ghost" type="submit">Email me a link</button>
      </form>
      {note && <p className="muted">{note}</p>}
    </div>
  );
}
