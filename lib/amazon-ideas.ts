import type { Criteria } from "./catalog";
import { amazonLink } from "./amazon";

/**
 * "More gift ideas on Amazon": up to 10 Amazon searches that match what the
 * shopper asked for, shown under the three picks as tagged links.
 *
 * Until the Creators API is on (Amazon needs 10 qualifying sales in 30 days),
 * the app can't show Amazon products, prices or images, so each idea is a
 * kind of gift that opens Amazon's own search results. Once the API is on,
 * this can return real products instead.
 */
export type AmazonIdea = { label: string; emoji: string; url: string };

// Kinds of gift for each interest (lib/types.ts INTERESTS), style and occasion.
const BY_INTEREST: Record<string, [string, string][]> = {
  cooking: [["Cast iron skillet", "🍳"], ["Chef's knife", "🔪"], ["Spice gift set", "🌶️"], ["Cookbook", "📖"]],
  coffee: [["Pour over coffee kit", "☕"], ["Burr coffee grinder", "☕"], ["Coffee sampler gift set", "🫘"], ["Insulated travel mug", "🥤"]],
  tea: [["Loose leaf tea sampler", "🍵"], ["Glass teapot with infuser", "🫖"], ["Matcha set", "🍵"]],
  outdoors: [["Camping hammock", "🏕️"], ["Headlamp", "🔦"], ["Insulated water bottle", "🧴"], ["Camp cooking set", "🔥"]],
  hiking: [["Hiking daypack", "🎒"], ["Trekking poles", "🥾"], ["Merino wool hiking socks", "🧦"]],
  fitness: [["Resistance bands set", "💪"], ["Foam roller", "🧘"], ["Smart jump rope", "⏱️"], ["Gym bag", "🎒"]],
  sports: [["Sports fan gift", "🏟️"], ["Portable stadium seat", "🪑"], ["Insulated sports bottle", "🧴"]],
  tech: [["Wireless charging stand", "🔌"], ["Bluetooth tracker tag", "📍"], ["Portable power bank", "🔋"], ["Noise canceling earbuds", "🎧"]],
  gaming: [["Gaming headset", "🎧"], ["Controller charging dock", "🎮"], ["RGB mouse pad", "🖱️"]],
  reading: [["Book light", "💡"], ["Kindle accessories", "📚"], ["Personalized bookmark", "🔖"], ["Book lover gift", "📖"]],
  music: [["Bluetooth speaker", "🔊"], ["Vinyl record cleaning kit", "💿"], ["Music lover gift", "🎵"]],
  movies: [["Popcorn maker", "🍿"], ["Movie night gift basket", "🎬"], ["Mini projector", "📽️"]],
  photography: [["Camera strap", "📷"], ["Instant camera", "📸"], ["Photo printer", "🖨️"]],
  travel: [["Packing cubes", "🧳"], ["Travel neck pillow", "✈️"], ["Scratch off world map", "🗺️"], ["Travel toiletry bag", "👜"]],
  art: [["Watercolor paint set", "🎨"], ["Sketchbook set", "✏️"], ["Art supplies gift set", "🖌️"]],
  crafts: [["Embroidery kit", "🧵"], ["Knitting starter kit", "🧶"], ["Candle making kit", "🕯️"]],
  gardening: [["Gardening tool set", "🌱"], ["Indoor herb garden kit", "🌿"], ["Gardening gloves", "🧤"]],
  home: [["Scented candle gift set", "🕯️"], ["Throw blanket", "🛋️"], ["Essential oil diffuser", "💨"]],
  pets: [["Dog lover gift", "🐶"], ["Cat lover gift", "🐱"], ["Custom pet portrait", "🖼️"]],
  fashion: [["Leather wallet", "👛"], ["Silk scarf", "🧣"], ["Jewelry box", "💍"]],
  beauty: [["Skincare gift set", "🧴"], ["Makeup brush set", "💄"], ["Hair care gift set", "💇"]],
  wellness: [["Spa gift basket", "🛁"], ["Weighted eye mask", "😴"], ["Aromatherapy gift set", "🌸"]],
  "board games": [["Board games for adults", "🎲"], ["Family board games", "🎲"], ["Puzzle 1000 pieces", "🧩"]],
  science: [["Science kit", "🔬"], ["Telescope for beginners", "🔭"], ["Crystal growing kit", "💎"]],
  "building toys": [["Building blocks set", "🧱"], ["STEM building kit", "🛠️"], ["Marble run", "🎢"]],
};
const BY_STYLE: Record<string, [string, string][]> = {
  classy: [["Luxury gift set", "✨"], ["Engraved gift", "🖋️"]],
  outdoor: [["Outdoor gift", "🌲"], ["Picnic set", "🧺"]],
  "personal care": [["Self care gift box", "🛁"], ["Bath bomb gift set", "🫧"]],
  cozy: [["Cozy socks gift set", "🧦"], ["Heated blanket", "🛋️"]],
  fun: [["Funny gift", "😂"], ["Desk toy", "🪀"]],
  practical: [["Practical gift", "🧰"], ["Multi tool", "🔧"]],
  techy: [["Gadget gift", "📱"], ["Smart home gadget", "🏠"]],
  creative: [["DIY craft kit", "✂️"], ["Creative gift", "🎨"]],
  foodie: [["Gourmet food gift basket", "🧀"], ["Chocolate gift box", "🍫"]],
};
const BY_OCCASION: Record<string, [string, string][]> = {
  birthday: [["Birthday gift box", "🎂"]],
  holiday: [["Christmas gift", "🎄"], ["Stocking stuffers", "🧦"]],
  graduation: [["Graduation gift", "🎓"]],
  wedding: [["Wedding gift", "💍"]],
  "new baby": [["New baby gift set", "🍼"], ["Baby keepsake", "👶"]],
  anniversary: [["Anniversary gift", "💞"]],
  "work anniversary": [["Work anniversary gift", "🏆"], ["Desk organizer", "🗂️"]],
  "thank you": [["Thank you gift box", "🙏"]],
  "get well": [["Get well soon gift box", "🌷"]],
  housewarming: [["Housewarming gift", "🏡"]],
};
const FALLBACK: [string, string][] = [["Unique gift idea", "🎁"], ["Gift basket", "🧺"], ["Personalized gift", "🖋️"]];

/** Up to `n` Amazon searches that fit the finder's criteria and the picks just shown. */
export function amazonIdeas(c: Criteria, pickTags: string[] = [], n = 10): AmazonIdea[] {
  const avoid = new Set(c.avoid ?? []);
  const sources: [string, string][][] = [];
  for (const t of [...new Set([...(c.likes ?? []), ...(c.boost ?? []), ...pickTags])]) if (!avoid.has(t) && BY_INTEREST[t]) sources.push(BY_INTEREST[t]);
  for (const s of c.styles ?? []) if (BY_STYLE[s]) sources.push(BY_STYLE[s]);
  if (c.occasion && BY_OCCASION[c.occasion]) sources.push(BY_OCCASION[c.occasion]);
  sources.push(FALLBACK);

  // Take one from each list in turn, so ten ideas cover several interests.
  const out: [string, string][] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < n && i < 6; i++) {
    for (const list of sources) {
      const x = list[i];
      if (x && !seen.has(x[0])) { seen.add(x[0]); out.push(x); }
      if (out.length >= n) break;
    }
  }
  const forWho = c.age != null && c.age < 13 ? " for kids" : c.age != null && c.age < 18 ? " for teens" : c.sex === "f" ? " for her" : c.sex === "m" ? " for him" : "";
  return out.map(([label, emoji]) => ({ label, emoji, url: amazonLink({ query: `${label}${forWho}` }) }));
}
