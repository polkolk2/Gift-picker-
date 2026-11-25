/**
 * What the catalog is built from: kinds of gift that CJdropshipping stocks,
 * each with the interests, styles, ages and price range it suits. The import
 * (/api/cj/import) searches CJ for each one and keeps the best real items:
 * every word of the search must be in the item's title, and its price
 * (item + shipping) must sit in the range.
 */
export type GiftQuery = {
  q: string;
  tags: string[];
  styles: string[];
  occasions?: string[];
  sex?: "f" | "m" | "any";
  ages: [number, number];
  emoji: string;
  usd: [number, number]; // item + shipping
  take?: number; // how many items to keep, 1 by default
};

export const GIFT_QUERIES: GiftQuery[] = [
  // Kids
  { q: "building blocks", tags: ["building toys"], styles: ["creative", "fun"], ages: [4, 12], emoji: "🧱", usd: [8, 60], take: 2 },
  { q: "magnetic tiles", tags: ["building toys", "science"], styles: ["creative", "fun"], ages: [3, 10], emoji: "🧲", usd: [10, 70] },
  { q: "marble run", tags: ["building toys", "science"], styles: ["creative", "fun"], ages: [4, 10], emoji: "🎢", usd: [10, 70] },
  { q: "dinosaur toy", tags: ["science"], styles: ["fun"], ages: [3, 9], emoji: "🦕", usd: [6, 45] },
  { q: "telescope", tags: ["science", "outdoors"], styles: ["techy", "outdoor"], ages: [8, 99], emoji: "🔭", usd: [20, 120] },
  { q: "microscope kids", tags: ["science"], styles: ["techy", "creative"], ages: [7, 14], emoji: "🔬", usd: [12, 70] },
  { q: "drawing tablet kids", tags: ["art"], styles: ["creative", "techy"], ages: [4, 12], emoji: "✏️", usd: [6, 40] },
  { q: "watercolor paint set", tags: ["art"], styles: ["creative"], ages: [6, 99], emoji: "🎨", usd: [8, 50] },
  { q: "plush toy", tags: ["pets"], styles: ["cozy", "fun"], ages: [2, 12], emoji: "🧸", usd: [6, 40], take: 2 },
  { q: "remote control car", tags: ["tech", "sports"], styles: ["fun", "techy"], ages: [6, 14], emoji: "🏎️", usd: [15, 80] },
  { q: "kids camera", tags: ["photography", "tech"], styles: ["techy", "fun"], ages: [5, 12], emoji: "📷", usd: [15, 60] },
  { q: "jigsaw puzzle", tags: ["board games"], styles: ["cozy"], ages: [8, 99], emoji: "🧩", usd: [8, 45] },
  { q: "slime kit", tags: ["crafts", "science"], styles: ["fun", "creative"], ages: [6, 12], emoji: "🫧", usd: [6, 35] },
  { q: "bracelet making kit", tags: ["crafts", "fashion"], styles: ["creative"], sex: "f", ages: [6, 14], emoji: "📿", usd: [6, 35] },
  { q: "kids ukulele", tags: ["music"], styles: ["creative", "fun"], ages: [5, 14], emoji: "🎸", usd: [15, 60] },
  // Teens and adults: tech
  { q: "bluetooth speaker", tags: ["music", "tech"], styles: ["techy", "fun"], ages: [12, 99], emoji: "🔊", usd: [12, 80], take: 2 },
  { q: "wireless earbuds", tags: ["music", "tech", "fitness"], styles: ["techy", "practical"], ages: [12, 99], emoji: "🎧", usd: [12, 80] },
  { q: "wireless charger", tags: ["tech"], styles: ["techy", "practical"], ages: [14, 99], emoji: "🔌", usd: [10, 60] },
  { q: "power bank", tags: ["tech", "travel"], styles: ["practical", "techy"], ages: [14, 99], emoji: "🔋", usd: [10, 60] },
  { q: "mini projector", tags: ["movies", "tech"], styles: ["techy", "fun"], ages: [14, 99], emoji: "📽️", usd: [35, 150] },
  { q: "smart watch", tags: ["tech", "fitness"], styles: ["techy", "practical"], ages: [14, 99], emoji: "⌚", usd: [20, 120] },
  { q: "mechanical keyboard", tags: ["gaming", "tech"], styles: ["techy"], ages: [13, 60], emoji: "⌨️", usd: [25, 120] },
  { q: "gaming mouse", tags: ["gaming", "tech"], styles: ["techy"], ages: [12, 50], emoji: "🖱️", usd: [10, 60] },
  { q: "gaming headset", tags: ["gaming", "music"], styles: ["techy"], ages: [12, 50], emoji: "🎮", usd: [15, 80] },
  { q: "retro game console", tags: ["gaming"], styles: ["fun", "techy"], ages: [9, 50], emoji: "🕹️", usd: [20, 90] },
  { q: "instant camera", tags: ["photography", "travel"], styles: ["fun", "creative"], ages: [12, 50], emoji: "📸", usd: [30, 130] },
  { q: "ring light", tags: ["photography", "beauty"], styles: ["techy", "creative"], ages: [13, 45], emoji: "💡", usd: [12, 60] },
  { q: "led strip lights", tags: ["home", "gaming"], styles: ["fun", "techy"], ages: [12, 40], emoji: "🌈", usd: [8, 45] },
  { q: "sunset lamp", tags: ["home", "photography"], styles: ["cozy", "fun"], ages: [12, 40], emoji: "🌅", usd: [8, 45] },
  { q: "galaxy projector", tags: ["home", "science"], styles: ["cozy", "fun"], ages: [6, 40], emoji: "🌌", usd: [12, 60] },
  // Home, cooking, drinks
  { q: "scented candle", tags: ["home", "wellness"], styles: ["cozy", "personal care"], ages: [16, 99], emoji: "🕯️", usd: [8, 50], take: 2 },
  { q: "throw blanket", tags: ["home"], styles: ["cozy"], ages: [10, 99], emoji: "🛋️", usd: [15, 80] },
  { q: "essential oil diffuser", tags: ["home", "wellness"], styles: ["cozy", "personal care"], ages: [16, 99], emoji: "💨", usd: [12, 60] },
  { q: "coffee grinder", tags: ["coffee", "cooking"], styles: ["foodie", "practical"], ages: [18, 99], emoji: "☕", usd: [15, 80] },
  { q: "pour over coffee", tags: ["coffee"], styles: ["foodie", "classy"], ages: [18, 99], emoji: "☕", usd: [12, 70] },
  { q: "milk frother", tags: ["coffee"], styles: ["foodie", "practical"], ages: [16, 99], emoji: "🥛", usd: [8, 40] },
  { q: "tea set", tags: ["tea"], styles: ["classy", "cozy"], ages: [16, 99], emoji: "🫖", usd: [15, 90] },
  { q: "insulated tumbler", tags: ["coffee", "outdoors", "fitness"], styles: ["practical"], ages: [12, 99], emoji: "🥤", usd: [10, 45] },
  { q: "wine glasses", tags: ["cooking", "home"], styles: ["classy"], ages: [21, 99], emoji: "🍷", usd: [12, 60] },
  { q: "chef knife", tags: ["cooking"], styles: ["practical", "classy"], ages: [18, 99], emoji: "🔪", usd: [15, 90] },
  { q: "cutting board", tags: ["cooking", "home"], styles: ["practical"], ages: [18, 99], emoji: "🪵", usd: [12, 60] },
  { q: "spice rack", tags: ["cooking", "home"], styles: ["practical"], ages: [18, 99], emoji: "🌶️", usd: [12, 60] },
  { q: "herb garden", tags: ["gardening", "cooking"], styles: ["creative", "practical"], ages: [14, 99], emoji: "🌿", usd: [10, 60] },
  { q: "plant pot", tags: ["gardening", "home"], styles: ["creative"], ages: [14, 99], emoji: "🪴", usd: [8, 45] },
  // Personal care and style
  { q: "makeup brush set", tags: ["beauty"], styles: ["personal care"], sex: "f", ages: [13, 99], emoji: "💄", usd: [8, 45] },
  { q: "jewelry box", tags: ["fashion"], styles: ["classy"], sex: "f", ages: [10, 99], emoji: "💍", usd: [10, 60] },
  { q: "necklace", tags: ["fashion"], styles: ["classy"], occasions: ["birthday", "anniversary", "graduation"], sex: "f", ages: [13, 99], emoji: "📿", usd: [8, 60], take: 2 },
  { q: "silk scarf", tags: ["fashion"], styles: ["classy"], sex: "f", ages: [16, 99], emoji: "🧣", usd: [8, 45] },
  { q: "leather wallet", tags: ["fashion"], styles: ["classy", "practical"], sex: "m", ages: [16, 99], emoji: "👛", usd: [10, 60] },
  { q: "watch box", tags: ["fashion"], styles: ["classy", "practical"], sex: "m", ages: [18, 99], emoji: "⌚", usd: [15, 70] },
  { q: "beard grooming kit", tags: ["beauty"], styles: ["personal care"], sex: "m", ages: [18, 99], emoji: "🧔", usd: [10, 50] },
  { q: "facial steamer", tags: ["beauty", "wellness"], styles: ["personal care"], ages: [16, 99], emoji: "🧖", usd: [15, 70] },
  { q: "massage gun", tags: ["fitness", "wellness"], styles: ["personal care", "practical"], ages: [18, 99], emoji: "💆", usd: [25, 110] },
  { q: "neck massager", tags: ["wellness"], styles: ["personal care", "cozy"], ages: [18, 99], emoji: "💆", usd: [15, 80] },
  { q: "eye mask", tags: ["wellness", "travel"], styles: ["personal care", "cozy"], ages: [14, 99], emoji: "😴", usd: [6, 35] },
  { q: "bath bomb", tags: ["wellness", "beauty"], styles: ["personal care"], ages: [10, 99], emoji: "🛁", usd: [8, 40] },
  { q: "cozy socks", tags: ["home"], styles: ["cozy"], ages: [8, 99], emoji: "🧦", usd: [6, 30] },
  // Active and outdoors
  { q: "yoga mat", tags: ["fitness", "wellness"], styles: ["practical"], ages: [14, 99], emoji: "🧘", usd: [12, 60] },
  { q: "resistance bands", tags: ["fitness"], styles: ["practical"], ages: [14, 99], emoji: "💪", usd: [8, 45] },
  { q: "jump rope", tags: ["fitness"], styles: ["practical", "fun"], ages: [8, 99], emoji: "🤸", usd: [6, 35] },
  { q: "camping hammock", tags: ["outdoors", "travel"], styles: ["outdoor", "cozy"], ages: [12, 99], emoji: "🏕️", usd: [15, 70] },
  { q: "camping lantern", tags: ["outdoors"], styles: ["outdoor", "practical"], ages: [12, 99], emoji: "🏮", usd: [10, 50] },
  { q: "headlamp", tags: ["outdoors", "hiking"], styles: ["outdoor", "practical"], ages: [12, 99], emoji: "🔦", usd: [8, 40] },
  { q: "hiking backpack", tags: ["hiking", "travel"], styles: ["outdoor", "practical"], ages: [14, 99], emoji: "🎒", usd: [20, 90] },
  { q: "picnic blanket", tags: ["outdoors"], styles: ["outdoor", "cozy"], ages: [16, 99], emoji: "🧺", usd: [12, 55] },
  { q: "pickleball paddle", tags: ["sports", "fitness"], styles: ["outdoor", "fun"], ages: [12, 99], emoji: "🏓", usd: [20, 90] },
  // Travel, work, reading, pets
  { q: "packing cubes", tags: ["travel"], styles: ["practical"], ages: [14, 99], emoji: "🧳", usd: [10, 50] },
  { q: "travel pillow", tags: ["travel"], styles: ["practical", "cozy"], ages: [12, 99], emoji: "✈️", usd: [8, 45] },
  { q: "toiletry bag", tags: ["travel"], styles: ["practical"], ages: [16, 99], emoji: "👜", usd: [10, 50] },
  { q: "desk organizer", tags: ["home"], styles: ["practical"], occasions: ["work anniversary", "thank you"], ages: [16, 99], emoji: "🗂️", usd: [10, 60] },
  { q: "laptop stand", tags: ["tech"], styles: ["practical"], ages: [16, 99], emoji: "💻", usd: [12, 60] },
  { q: "book light", tags: ["reading"], styles: ["practical", "cozy"], ages: [8, 99], emoji: "💡", usd: [6, 35] },
  { q: "bookends", tags: ["reading", "home"], styles: ["classy", "creative"], ages: [12, 99], emoji: "📚", usd: [10, 60] },
  { q: "journal notebook", tags: ["reading", "art"], styles: ["creative"], ages: [10, 99], emoji: "📓", usd: [6, 35] },
  { q: "dog toy", tags: ["pets"], styles: ["fun"], ages: [8, 99], emoji: "🐶", usd: [6, 35] },
  { q: "cat toy", tags: ["pets"], styles: ["fun"], ages: [8, 99], emoji: "🐱", usd: [6, 35] },
  { q: "pet bed", tags: ["pets", "home"], styles: ["cozy"], ages: [12, 99], emoji: "🐾", usd: [15, 80] },
  // Occasions
  { q: "baby blanket", tags: ["home"], styles: ["cozy"], occasions: ["new baby"], ages: [18, 99], emoji: "👶", usd: [10, 60] },
  { q: "christmas ornament", tags: ["home"], styles: ["cozy", "creative"], occasions: ["holiday"], ages: [6, 99], emoji: "🎄", usd: [6, 40] },
  { q: "photo frame", tags: ["photography", "home"], styles: ["classy", "creative"], occasions: ["anniversary", "wedding", "graduation", "housewarming"], ages: [16, 99], emoji: "🖼️", usd: [8, 50] },
];
