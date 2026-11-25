import Anthropic from "@anthropic-ai/sdk";
import { shopperPrice } from "./pricing";
import type { Pick, Product, Recipient } from "./types";
import { ageOn } from "./dates";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";

/** Who the gift is for, from a saved person or from the quick finder. */
export type Who = {
  name: string;
  relationship?: string | null;
  age: number | null;
  sex: "f" | "m" | "any";
  city?: string | null;
  budgetMin: number;
  budgetMax: number;
  likes: string[];
  dislikes: string[];
  styles: string[];
  notes?: string | null;
};

export function whoFromRecipient(r: Recipient, styles: string[] = [], budget?: { min: number; max: number }): Who {
  return {
    name: r.name, relationship: r.relationship, age: ageOn(r.birthdate, new Date()), sex: r.sex, city: r.city,
    budgetMin: budget?.min ?? r.budget_min, budgetMax: budget?.max ?? r.budget_max,
    likes: r.likes, dislikes: r.dislikes, styles, notes: r.notes,
  };
}

function describe(w: Who) {
  return [
    `Name: ${w.name}`,
    w.relationship ? `Relationship to giver: ${w.relationship}` : null,
    `Age: ${w.age ?? "unknown"}`,
    `Sex: ${w.sex === "f" ? "female" : w.sex === "m" ? "male" : "not given"}`,
    w.city ? `City: ${w.city}` : null,
    `Budget: $${w.budgetMin} to $${w.budgetMax}`,
    `Kind of gift the giver wants: ${w.styles.join(", ") || "any"}`,
    `Likes: ${w.likes.join(", ") || "none given"}`,
    `Dislikes: ${w.dislikes.join(", ") || "none given"}`,
    w.notes ? `Giver's notes: ${w.notes}` : null,
  ].filter(Boolean).join("\n");
}

async function askJson<T>(prompt: string, maxTokens = 1200): Promise<T> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt + "\n\nReply with only the JSON, no other text." }],
  });
  const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  const start = text.search(/[\[{]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  return JSON.parse(text.slice(start, end + 1)) as T;
}

export type Question = { q: string; options: string[] };

/** Round 3: three multiple-choice questions to narrow things down. */
export async function writeQuestions(r: Who, rejected: string[], occasion: string): Promise<Question[]> {
  const data = await askJson<{ questions: Question[] }>(
    `You help someone pick a ${occasion} gift. Two rounds of ideas were rejected.\n` +
    `Write exactly 3 short multiple-choice questions for the giver that would best narrow down what ${r.name} would love. ` +
    `Each has 4 options under 7 words.\n\n${describe(r)}\n\nRejected:\n- ${rejected.join("\n- ")}\n\n` +
    `JSON shape: {"questions":[{"q":"...","options":["...","...","...","..."]}]}`,
  );
  return (data.questions ?? []).slice(0, 3);
}

/**
 * Round 3 answer: Claude chooses from the products we can actually ship,
 * so every pick can be bought at checkout.
 */
export async function choosePicks(
  r: Who, catalog: Product[], rejected: string[], answers: { q: string; a: string }[], occasion: string,
): Promise<Pick[]> {
  const options = catalog
    .filter((p) => !rejected.includes(p.sku))
    .map((p) => `${p.sku} | ${p.name} | $${(shopperPrice(p.priceCents) / 100).toFixed(2)} | ${[...p.tags, ...p.styles].join(", ")} | ${p.occasions.join(", ") || "any occasion"}`)
    .join("\n");
  const data = await askJson<{ picks: { sku: string; why: string }[] }>(
    `Pick the 3 best ${occasion} gifts for this person from the list. Stay in budget unless nothing fits, and prefer the kind of gift the giver asked for.\n\n` +
    `${describe(r)}\n\nGiver's answers:\n${answers.map((x) => `Q: ${x.q}\nA: ${x.a}`).join("\n")}\n\n` +
    `Products (sku | name | price | tags and styles | occasions):\n${options}\n\n` +
    `JSON shape: {"picks":[{"sku":"...","why":"one sentence on why it fits"}]}`,
  );
  const bySku = new Map(catalog.map((p) => [p.sku, p]));
  return (data.picks ?? [])
    .map((x) => { const p = bySku.get(String(x.sku)); return p ? { ...p, why: String(x.why ?? "") } : null; })
    .filter((x): x is Pick => x !== null)
    .slice(0, 3);
}
