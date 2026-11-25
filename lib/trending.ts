/**
 * Popular gifts by age and sex, for when a profile says little. Each entry
 * lists words that, found in a product's name, mark it as a gift people in that
 * group commonly get. The ranker gives those products a lift; it still keeps
 * likes, dislikes, budget and style ahead of this.
 */
export type Trend = { ages: [number, number]; sex: "f" | "m" | "any"; words: string[] };

export const TRENDING: Trend[] = [
  // Young kids
  { ages: [2, 7], sex: "any", words: ["building block", "blocks", "plush", "stuffed", "dinosaur", "magnetic", "puzzle", "night light", "kids camera", "musical toy"] },
  // Kids
  { ages: [8, 12], sex: "any", words: ["lego", "building", "remote control", "rc car", "drone", "slime", "microscope", "telescope", "kids watch", "galaxy projector", "3d pen", "fidget"] },
  { ages: [8, 12], sex: "f", words: ["bracelet kit", "jewelry box", "plush", "craft kit", "makeup set kids", "diary"] },
  // Teens
  { ages: [13, 17], sex: "any", words: ["earbuds", "headphones", "bluetooth speaker", "led strip", "sunset lamp", "galaxy projector", "mini projector", "ring light", "phone stand", "gaming", "instant camera"] },
  { ages: [13, 17], sex: "m", words: ["gamepad", "controller", "gaming headset", "mechanical keyboard", "gaming mouse", "smart watch", "sports watch", "basketball", "drone"] },
  { ages: [13, 17], sex: "f", words: ["necklace", "bracelet", "earrings", "makeup", "skin care", "hair", "tote", "plush", "jewelry box", "scrunchie"] },
  // Young adults
  { ages: [18, 25], sex: "any", words: ["earbuds", "headphones", "bluetooth speaker", "mini projector", "power bank", "led strip", "smart watch", "backpack", "phone stand", "polaroid", "instant camera"] },
  { ages: [18, 25], sex: "m", words: ["gaming", "gamepad", "controller", "headset", "keyboard", "mouse", "watch", "wallet", "cologne", "chain", "fitness", "dumbbell", "massage gun", "grill"] },
  { ages: [18, 25], sex: "f", words: ["necklace", "bracelet", "earrings", "ring", "makeup", "skin care", "facial", "hair", "tote", "handbag", "perfume", "candle", "blanket"] },
  // Adults
  { ages: [26, 64], sex: "any", words: ["coffee", "mug", "tumbler", "blanket", "candle", "speaker", "smart watch", "kitchen", "knife set", "wine", "cocktail", "backpack", "travel", "massage"] },
  { ages: [26, 64], sex: "m", words: ["watch", "wallet", "tool", "grill", "bbq", "whiskey", "golf", "fishing", "camping", "headphones", "leather", "cufflinks", "tie"] },
  { ages: [26, 64], sex: "f", words: ["necklace", "bracelet", "earrings", "jewelry", "skin care", "spa", "tote", "scarf", "candle", "aromatherapy", "diffuser", "planter"] },
  // Older adults
  { ages: [65, 120], sex: "any", words: ["blanket", "photo frame", "digital frame", "slippers", "tea", "puzzle", "garden", "massager", "reading light", "mug", "bird feeder"] },
];

/** How strongly a product's name matches what people this age and sex commonly get: 0, 1 or 2. */
export function trendScore(name: string, age: number | null | undefined, sex: "f" | "m" | "any" | undefined) {
  if (age == null) return 0;
  const n = name.toLowerCase();
  let hits = 0;
  for (const t of TRENDING) {
    if (age < t.ages[0] || age > t.ages[1]) continue;
    if (t.sex !== "any" && sex && sex !== "any" && t.sex !== sex) continue;
    if (t.words.some((w) => n.includes(w))) hits++;
  }
  return Math.min(2, hits);
}
