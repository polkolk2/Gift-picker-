/**
 * Amazon Associates links. AMAZON_TAG is your tracking ID (like yourname-20)
 * from Associates Central. Every Amazon link on the site carries it.
 *
 * Kept inside Amazon's Associates rules:
 * - No Amazon prices are shown anywhere. Amazon only allows prices that come
 *   from its Creators API or an Amazon-served link, so until that API is on,
 *   shoppers see the price on Amazon itself.
 * - No Amazon product images are stored or copied. An item shows Amazon's
 *   picture only when you paste SiteStripe's Image or Text+Image code, and
 *   then Amazon serves it from its own servers.
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

/** True for Amazon's own ad-serving hosts, which SiteStripe image and widget code load from. */
const isAdHost = (h: string) => /(^|\.)amazon-adsystem\.com$/i.test(h);
const srcUrl = (raw: string) => {
  try { const u = new URL(raw.replace(/&amp;/g, "&"), "https://ws-na.amazon-adsystem.com"); return u.protocol === "https:" && isAdHost(u.hostname) ? u.toString() : null; } catch { return null; }
};

/**
 * Reads SiteStripe's Image or Text+Image code. Amazon serves the picture (and,
 * for Text+Image, the name and price) itself, which Associates may show.
 * Only the addresses are kept, never the pasted HTML.
 */
export function readSiteStripeCode(html: string): { url: string | null; imageSrc: string | null; embedSrc: string | null } {
  const iframe = html.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i)?.[1];
  const href = html.match(/<a[^>]*\shref=["']([^"']+)["']/i)?.[1];
  const img = [...html.matchAll(/<img[^>]*\ssrc=["']([^"']+)["']/gi)].map((m) => m[1]).find((s) => /widgets\/q|images-amazon|media-amazon/i.test(s));
  return {
    url: href ? cleanAmazonUrl(href.replace(/&amp;/g, "&")) : null,
    imageSrc: img ? srcUrl(img) : null,
    embedSrc: iframe ? srcUrl(iframe) : null,
  };
}
