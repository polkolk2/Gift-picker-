import LoginButtons from "./LoginButtons";
import { PERK_PEOPLE, PERK_PERCENT } from "@/lib/pricing";

export default async function Login({ searchParams }: { searchParams: Promise<{ gift?: string }> }) {
  const { gift } = await searchParams;
  return (
    <main className="narrow stack">
      <h1>{gift ? "Create your free account" : "Sign in"}</h1>
      <p className="muted">
        {gift
          ? `Save ${PERK_PEOPLE} family members or friends and your next gift is ${PERK_PERCENT}% off. We'll remind you before every birthday and big day.`
          : "Save the people you buy for, get reminded before every birthday and big day, and send a gift in a few taps."}
      </p>
      <LoginButtons gift={gift?.slice(0, 64)} />
    </main>
  );
}
