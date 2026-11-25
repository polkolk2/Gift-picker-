/**
 * Amazon Associates links. AMAZON_TAG is your tracking ID (like yourname-20)
 * from Associates Central. Every Amazon link on the site carries it.
 *
 * Kept inside Amazon's Associates rules:
 * - No Amazon prices are shown anywhere. Amazon only allows prices that come
 *   from its Creators API or an Amazon-served link, so until that API is on,
 *   shoppers see the price on Amazon itself.
 * - No Amazon product images are stored or copied; items use an emoji.
 * - Links go straight to amazon.com (no redirects or cloaking), open in a new
 *   tab, and are marked sponsored.
 * - Amazon links are only on the website, never in emails, texts or gift links.
 * - The required Associate statement is in the footer of every page and on
 *   /disclosure.
 */
export const AMAZON_TAG = (process.env.AMAZON_TAG ?? "").trim();

/** The statement Amazon's Operating Agreement asks Associates to show. */
export const ASSOCIATE_STATEMENT = "As an Amazon Associate I earn from qualifying purchases.";

const ASIN = /^[A-Z0-9]{10}$/;
export const isAsin = (s: string | null | undefined) => !!s && ASIN.test(s);

/** A link to one product page by its ASIN, or to Amazon search results for a phrase. */
export function amazonLink(x: { asin?: string | null; query?: string | null }) {
  const tag = AMAZON_TAG ? `tag=${encodeURIComponent(AMAZON_TAG)}` : "";
  if (isAsin(x.asin)) return `https://www.amazon.com/dp/${x.asin}${tag ? `?${tag}` : ""}`;
  const q = `k=${encodeURIComponent(String(x.query ?? "").trim())}`;
  return `https://www.amazon.com/s?${q}${tag ? `&${tag}` : ""}`;
}

/** rel for every Amazon link: paid link, no ranking credit, no window access. */
export const AMAZON_REL = "sponsored nofollow noopener noreferrer";

/**
 * Checks a link pasted from Amazon (SiteStripe's amzn.to short link or an
 * amazon.com product page) and returns the link to store, or null if it isn't
 * Amazon's. A product page is rebuilt from its ASIN so it carries your tag.
 */
export function cleanAmazonUrl(raw: string): string | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  if (host === "amzn.to") return /^\/[A-Za-z0-9]{4,16}$/.test(u.pathname) ? `https://amzn.to${u.pathname}` : null;
  if (host === "amazon.com" || host === "www.amazon.com") {
    const asin = u.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/)?.[1];
    return asin ? amazonLink({ asin }) : null;
  }
  return null;
}
