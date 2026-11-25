/**
 * Pricing: no fees. A product's price_cents is its source price (what the
 * supplier charges you to drop-ship it), and the shopper pays that plus your
 * markup, rounded up to the next dollar and shown as one price. MARKUP_PERCENT
 * sets the markup (10 by default).
 */
export const MARKUP_PERCENT = Number(process.env.MARKUP_PERCENT ?? 10);

/** What the shopper pays for a gift before tax, shipping included: cost plus markup, rounded up to the dollar. */
export const shopperPrice = (sourceCents: number) => Math.ceil((sourceCents * (100 + MARKUP_PERCENT)) / 10000) * 100;

/** Your markup on a gift, in cents (the 10% plus the round-up). */
export const markupFor = (sourceCents: number) => shopperPrice(sourceCents) - sourceCents;

/**
 * The family perk: someone who got a gift from a business, made their own
 * account and saved PERK_PEOPLE people gets PERK_PERCENT off their next gift.
 * 10% off a 10% markup means that gift sells at about your cost.
 */
export const PERK_PEOPLE = Number(process.env.PERK_PEOPLE ?? 3);
export const PERK_PERCENT = Number(process.env.PERK_PERCENT ?? 10);
export const perkPrice = (sourceCents: number) => Math.round((shopperPrice(sourceCents) * (100 - PERK_PERCENT)) / 100);

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
