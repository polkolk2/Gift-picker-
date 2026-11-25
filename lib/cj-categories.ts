/**
 * The CJdropshipping categories the catalog is pulled from, each with the
 * interests, styles, ages and sex its items suit. The feed import
 * (/api/cj/feed) takes the free-shipping items of each one, and the gift
 * finder then picks from them by age, sex, likes, dislikes and budget.
 * Ids come from /api/cj/categories.
 */
export type FeedCategory = {
  name: string;
  ids: string[]; // CJ third-level category ids
  tags: string[];
  styles: string[];
  occasions?: string[];
  sex?: "f" | "m" | "any";
  ages: [number, number];
  emoji: string;
  maxUsd?: number; // CJ price cap, 80 by default
  minUsd?: number; // skip anything cheaper (for the pricier gifts below)
};

export const FEED_CATEGORIES: FeedCategory[] = [
  // Toys and kids
  { name: "Blocks", ids: ["835F7743-8432-4D0F-90F0-E76C89F7C5B7"], tags: ["building toys"], styles: ["creative", "fun"], ages: [4, 12], emoji: "🧱" },
  { name: "Plush animals", ids: ["DD918287-C279-466A-B9C6-56079DE4B37A"], tags: ["pets"], styles: ["cozy", "fun"], ages: [2, 14], emoji: "🧸" },
  { name: "Action figures", ids: ["F18491A9-2F33-4D85-A154-78EE4CD2AD33"], tags: ["movies", "gaming"], styles: ["fun"], ages: [5, 14], emoji: "🦸" },
  { name: "RC toys", ids: ["AEABDF3C-35E9-4BDA-8F5B-DA602BC5B9C8"], tags: ["tech"], styles: ["fun", "techy"], ages: [8, 16], emoji: "🚁" },
  { name: "Electronic pets", ids: ["6614840A-DB50-4FBB-80FD-705F4FD59BFA"], tags: ["pets", "tech"], styles: ["fun", "techy"], ages: [4, 12], emoji: "🐶" },
  { name: "3D pens", ids: ["D8BBE038-9ECD-4698-8CB1-DE63E27F33C7"], tags: ["art", "crafts", "tech"], styles: ["creative", "techy"], ages: [8, 99], emoji: "🖊️" },
  { name: "Diamond painting", ids: ["EEC881A3-0A55-4BBF-9ADB-EB290116A67A", "C8AA2A38-B339-468F-87D3-AD2DB0697F93"], tags: ["crafts", "art"], styles: ["creative", "cozy"], ages: [10, 99], emoji: "💎" },
  { name: "Wall art", ids: ["2409230854411618700"], tags: ["art", "home"], styles: ["creative", "classy"], occasions: ["housewarming"], ages: [16, 99], emoji: "🖼️" },
  { name: "New baby", ids: ["4065FFF7-4AAA-4CFA-B04B-639C93624469", "77A1D79C-B67E-42C0-850F-00005042548C"], tags: ["home"], styles: ["practical", "cozy"], occasions: ["new baby"], ages: [18, 99], emoji: "👶" },
  { name: "Kids' watches", ids: ["FBD85934-5409-4EC6-A6B5-FDBF072AA0E2"], tags: ["fashion", "tech"], styles: ["fun", "practical"], ages: [5, 13], emoji: "⌚" },

  // Tech
  { name: "Speakers", ids: ["C1AB7563-AED4-44D8-9F01-05BD91C65307"], tags: ["music", "tech"], styles: ["techy", "fun"], ages: [12, 99], emoji: "🔊" },
  { name: "Headphones", ids: ["DAECCC3B-13D8-4978-86A8-61D3DF186134"], tags: ["music", "tech", "gaming"], styles: ["techy"], ages: [12, 99], emoji: "🎧" },
  { name: "Microphones", ids: ["8FD4CA46-AA88-4CDC-8EBA-EBD8412152E2"], tags: ["music", "tech"], styles: ["techy", "creative"], ages: [12, 99], emoji: "🎤" },
  { name: "Smart watches", ids: ["C83EF2A0-8FA3-4713-9901-2FD6E4554D97", "895CF515-0F6B-481D-8A32-604EDCBEFBED"], tags: ["tech", "fitness"], styles: ["techy", "practical"], ages: [13, 99], emoji: "⌚" },
  { name: "Gamepads and handhelds", ids: ["1F23F16D-0A39-4D38-AB9C-1F21EEDEBEDD", "2F6CCFAA-853F-41EF-8B91-24028A333948"], tags: ["gaming", "tech"], styles: ["techy", "fun"], ages: [8, 50], emoji: "🎮" },
  { name: "Projectors", ids: ["0AC6B44A-12CC-456F-831F-54064C77D303"], tags: ["movies", "tech"], styles: ["techy", "fun"], ages: [14, 99], emoji: "📽️", maxUsd: 150 },
  { name: "Cameras", ids: ["AD21D6F7-42CB-44E7-89B2-542692C7D101", "AA40156F-A334-475E-9CA0-7E5520645980"], tags: ["photography", "tech", "travel"], styles: ["techy", "creative"], ages: [10, 99], emoji: "📷", maxUsd: 150 },
  { name: "Photo studio", ids: ["11D96803-A0A3-4175-B49B-2102EC285965", "A2B55BEF-9B7D-44A0-8E80-A14FFFBBBD94"], tags: ["photography"], styles: ["creative", "techy"], ages: [14, 99], emoji: "📸" },
  { name: "Power banks and chargers", ids: ["491E5474-524C-4666-BDD7-4E35E38900EA", "B200FABB-A76B-4750-9957-FEA3DCB21F1F"], tags: ["tech", "travel"], styles: ["practical", "techy"], ages: [14, 99], emoji: "🔋" },
  { name: "Phone stands", ids: ["9170B3F9-5B9C-4C39-8CD6-7DC00E481D47"], tags: ["tech"], styles: ["practical"], ages: [14, 99], emoji: "📱" },
  { name: "Smart home", ids: ["36F73513-6A5A-445D-87F9-BF3D6629E649"], tags: ["tech", "home"], styles: ["techy", "practical"], ages: [18, 99], emoji: "🏠" },
  { name: "Night lights", ids: ["538CB48E-B7A0-46F7-B5A2-BB8183247B23"], tags: ["home"], styles: ["cozy", "fun"], ages: [3, 99], emoji: "🌙" },

  // Home and kitchen
  { name: "Drinkware", ids: ["CF330457-0E5B-4FAF-9BAE-7D2C247BD8DE"], tags: ["coffee", "tea"], styles: ["practical", "foodie"], ages: [14, 99], emoji: "☕" },
  { name: "Barware", ids: ["BEDFD1CC-E7CC-438F-9050-D7737904203D"], tags: ["cooking", "home"], styles: ["classy", "foodie"], occasions: ["housewarming", "wedding"], ages: [21, 99], emoji: "🍸" },
  { name: "Cooking tools", ids: ["E448A723-43DC-4BD8-A9AD-2FB9699338B4", "7C8E809A-460A-4F50-8A2F-B62AD010BFF8"], tags: ["cooking"], styles: ["foodie", "practical"], occasions: ["housewarming"], ages: [16, 99], emoji: "🍳" },
  { name: "Kitchen knives", ids: ["23ADD7CB-065A-4A02-B8E8-43D3F041B90B"], tags: ["cooking"], styles: ["foodie", "classy"], ages: [21, 99], emoji: "🔪" },
  { name: "Dinnerware", ids: ["0F4CFA22-8B97-4016-94A6-18066B9BD05C"], tags: ["cooking", "home"], styles: ["classy"], occasions: ["housewarming", "wedding"], ages: [21, 99], emoji: "🍽️" },
  { name: "Blankets and pillows", ids: ["6939DA08-F7F8-48FB-A7E8-169AEAC92404", "36F37524-3EAF-4E20-B989-10137FD0ED70", "300CC260-CF9D-4AEA-9FC2-6C8DB8A35B51"], tags: ["home"], styles: ["cozy"], occasions: ["housewarming"], ages: [10, 99], emoji: "🛋️" },
  { name: "Towels", ids: ["331F43CE-CA1D-45F2-BE2A-8AE62EC10251"], tags: ["home", "wellness"], styles: ["cozy", "practical"], ages: [18, 99], emoji: "🛁" },
  { name: "Home office", ids: ["87CF251F-8D11-4DE0-A154-9694D9858EB3", "2409230543341601500", "2252588B-72E3-4397-8C92-7D9967161084"], tags: ["reading", "home"], styles: ["practical"], occasions: ["graduation", "work anniversary"], ages: [12, 99], emoji: "🗂️" },
  { name: "Party and holiday decor", ids: ["621F9C38-814C-40C2-9F9D-7CE12DB8FB4C", "7B975B46-46DF-4C3A-BC58-1F4F2DDB9413"], tags: ["home", "crafts"], styles: ["fun", "creative"], occasions: ["holiday", "housewarming"], ages: [10, 99], emoji: "🎄" },
  { name: "Music instruments", ids: ["2603180848241600400", "02FB2558-F014-4E0A-A2FE-30BE514A2B01"], tags: ["music"], styles: ["creative", "fun"], ages: [6, 99], emoji: "🎶", maxUsd: 120 },

  // Jewelry, watches and fashion
  { name: "Necklaces", ids: ["95D9F317-1DB3-4E42-A031-02223215B9C5"], tags: ["fashion"], styles: ["classy"], occasions: ["anniversary", "birthday"], sex: "f", ages: [12, 99], emoji: "📿" },
  { name: "Bracelets", ids: ["0615F8DB-C10F-4BEF-892B-1C5B04268938"], tags: ["fashion"], styles: ["classy"], sex: "f", ages: [10, 99], emoji: "💫" },
  { name: "Earrings", ids: ["D28405AE-66C6-42E6-BFF0-D6FDCB5C083C", "D7CE9827-F50A-4B07-84BF-1BFE44188A1C"], tags: ["fashion"], styles: ["classy"], sex: "f", ages: [12, 99], emoji: "✨" },
  { name: "Rings", ids: ["56B4F8B6-8600-4A18-913E-53F2F693EC2C"], tags: ["fashion"], styles: ["classy"], sex: "f", ages: [14, 99], emoji: "💍" },
  { name: "Silver and pearl jewelry", ids: ["552F095A-904C-40E4-A43B-0CD1CE15D29F", "84ED4B7F-D7C3-412F-AF18-04F25C91985C"], tags: ["fashion"], styles: ["classy"], occasions: ["anniversary", "wedding"], sex: "f", ages: [16, 99], emoji: "🦪", maxUsd: 120 },
  { name: "Men's jewelry", ids: ["E403FB8A-B59A-4A81-B776-EBF3343FE3E3", "B5525066-3504-4E5C-962F-9C2D8C38F66D"], tags: ["fashion"], styles: ["classy"], sex: "m", ages: [16, 99], emoji: "🔗" },
  { name: "Keychains", ids: ["1363289906151034880"], tags: ["fashion"], styles: ["fun", "practical"], ages: [10, 99], emoji: "🔑" },
  { name: "Men's watches", ids: ["1987B0AD-8C6A-4D02-B5B2-5D94E83B069F", "3D882765-B20E-4EFD-BFCC-136942A83C4C", "BF68CA3E-F698-475E-A1AD-C8E4C44D7C8D"], tags: ["fashion"], styles: ["classy", "practical"], sex: "m", ages: [14, 99], emoji: "⌚", maxUsd: 120 },
  { name: "Women's watches", ids: ["A044AC0D-BA3B-4967-8300-1BD57F00048E", "F40CB152-1391-4CA9-9BAE-0316DA2D3D2B", "DC682F4C-BD7E-4DB0-93CB-33B4CD54BE87"], tags: ["fashion"], styles: ["classy"], sex: "f", ages: [14, 99], emoji: "⌚", maxUsd: 120 },
  { name: "Wallets", ids: ["F3F4B418-17DF-49A1-AD76-A436B7618FFC"], tags: ["fashion"], styles: ["classy", "practical"], sex: "m", ages: [14, 99], emoji: "👛" },
  { name: "Women's wallets and clutches", ids: ["0ADE366E-CDF4-47E7-8720-B480220E1BD4", "CB7C7348-41DC-4AA5-9BD0-CC2D555899BB"], tags: ["fashion"], styles: ["classy"], sex: "f", ages: [14, 99], emoji: "👛" },
  { name: "Backpacks", ids: ["CDCCB9B1-D5DD-4C20-AF32-101FE427B63C", "78BCE010-8E22-416F-82E2-6E5C6AE0CECE"], tags: ["travel"], styles: ["practical"], occasions: ["graduation"], ages: [10, 99], emoji: "🎒" },
  { name: "Travel bags", ids: ["E89AC661-0B9E-4967-A0A3-7B0C6DEDDC7D"], tags: ["travel"], styles: ["practical"], ages: [16, 99], emoji: "🧳", maxUsd: 120 },
  { name: "Totes", ids: ["8F3ADC01-68FE-4CBE-BB1D-0DE42A730749"], tags: ["fashion", "travel"], styles: ["practical"], sex: "f", ages: [14, 99], emoji: "👜" },
  { name: "Scarves", ids: ["0DC4DF6F-4EC5-47DF-B20D-863ADF69319F", "37F32196-21BB-49CE-B2D4-80787A5DF276"], tags: ["fashion"], styles: ["cozy", "classy"], occasions: ["holiday"], ages: [12, 99], emoji: "🧣" },
  { name: "Beanies and gloves", ids: ["C0EFBA18-A36D-48CD-B953-85DDFCB9B1C6", "44A3ADE0-A8EC-4101-A8DE-DF42F56EF3F1", "7B2039D9-FF87-4514-954B-021289724271"], tags: ["fashion", "outdoors"], styles: ["cozy", "practical"], occasions: ["holiday"], ages: [8, 99], emoji: "🧤" },
  { name: "Ties", ids: ["2410301013241608600"], tags: ["fashion"], styles: ["classy"], occasions: ["work anniversary", "graduation"], sex: "m", ages: [16, 99], emoji: "👔" },

  // Beauty and wellness
  { name: "Makeup sets", ids: ["426792A7-4906-403D-AD17-8293AFF00E66", "8FB2C16C-4C1B-4B5A-89F8-BC30FB2C442A", "A30E8F55-DC2C-4842-9372-91B96DEFDCC2"], tags: ["beauty"], styles: ["personal care"], sex: "f", ages: [14, 99], emoji: "💄" },
  { name: "Skin care", ids: ["EDE3FAD9-0E6C-4F7C-9016-A2299469AA7C", "E0238E88-0C63-427F-812E-BA1FCE4C67B4"], tags: ["beauty", "wellness"], styles: ["personal care"], ages: [16, 99], emoji: "🧴" },
  { name: "Essential oils", ids: ["CB1A9CEF-8333-4D2F-B19A-418C6DE376C7"], tags: ["wellness", "home"], styles: ["personal care", "cozy"], ages: [16, 99], emoji: "🌿" },
  { name: "Beauty tools", ids: ["AB11F624-D292-4A8E-9284-BD368B893A2C", "D23FFB85-4185-4FA3-BAF0-224A4F516741", "6D086E0D-8C3F-4B99-BA44-140F3F7C444E", "2502140311201613700"], tags: ["beauty", "wellness"], styles: ["personal care"], sex: "f", ages: [16, 99], emoji: "🪞" },
  { name: "Hair tools", ids: ["C75F27EE-695C-423E-BCB4-7CFE67221332", "47D355FB-E6C1-4E0B-AE31-0B1696A4B68E"], tags: ["beauty"], styles: ["personal care"], sex: "f", ages: [14, 99], emoji: "💇" },
  { name: "Shaving", ids: ["5DE3BC4F-41A8-4806-8E66-47537903123A"], tags: ["beauty"], styles: ["personal care", "practical"], sex: "m", ages: [16, 99], emoji: "🪒" },

  // Sports and outdoors
  { name: "Fitness gear", ids: ["C20B25A2-348C-48C8-A2C8-FE33749A40DE"], tags: ["fitness", "sports"], styles: ["practical"], ages: [14, 99], emoji: "🏋️" },
  { name: "Camping and hiking", ids: ["EA851596-F20F-4AA5-8869-4BB5CA1968DC"], tags: ["outdoors", "hiking", "travel"], styles: ["outdoor", "practical"], ages: [12, 99], emoji: "🏕️" },
  { name: "Golf", ids: ["FD5E95E1-C8DC-4CBD-A203-8BCF3BA951B9"], tags: ["sports", "outdoors"], styles: ["outdoor"], ages: [14, 99], emoji: "⛳" },
  { name: "Fishing", ids: ["9704D88F-46A0-49F6-98C4-929AE91941F5", "37C76B77-3E08-456A-B184-4516E7D6EE81", "11E0FCD6-AD17-4F72-B5FF-8F8C79F85CE5"], tags: ["outdoors", "sports"], styles: ["outdoor"], ages: [10, 99], emoji: "🎣" },
  { name: "Cycling", ids: ["161FA128-487C-4451-8B49-CB81B5A30A54", "2502140309251616200", "7992143D-A8B2-4A05-A4E4-7F4AF73AA577"], tags: ["sports", "outdoors", "fitness"], styles: ["outdoor", "practical"], ages: [10, 99], emoji: "🚲" },
  { name: "Skiing", ids: ["8B8C7FFB-6686-4994-B6DB-E5B8C1AAC9A6"], tags: ["sports", "outdoors"], styles: ["outdoor"], ages: [10, 99], emoji: "⛷️", maxUsd: 120 },

  // Pets
  { name: "Pet toys", ids: ["2410110339311602900", "2410110339451623300", "2410110340031614900", "2410110340531618900", "2410110340411608400"], tags: ["pets"], styles: ["fun"], ages: [8, 99], emoji: "🐾" },
  { name: "Pet beds", ids: ["2410110358051626100", "2410110357511615700", "2410110358191601900"], tags: ["pets", "home"], styles: ["cozy"], ages: [12, 99], emoji: "🐕" },
];

// Pricier gifts: the same categories again, taking only items from $45 to $220,
// so the $50 to $100, $100 to $200 and $200+ budgets have real choices, with
// more for men. They sit at the end of the list, so a feed job can start here.
const PREMIUM = [
  "Men's watches", "Men's jewelry", "Wallets", "Shaving", "Travel bags", "Backpacks", "Golf", "Fishing",
  "Camping and hiking", "Cycling", "Fitness gear", "Smart watches", "Headphones", "Speakers", "Projectors",
  "Cameras", "Gamepads and handhelds", "Smart home", "Kitchen knives", "Barware", "Music instruments",
  "Women's watches", "Silver and pearl jewelry", "Necklaces", "Skin care", "Beauty tools", "Hair tools", "Blankets and pillows",
];
export const PREMIUM_FROM = FEED_CATEGORIES.length;
for (const n of PREMIUM) {
  const c = FEED_CATEGORIES.find((x) => x.name === n);
  if (c) FEED_CATEGORIES.push({ ...c, name: `${c.name}, pricier`, ages: [Math.max(14, c.ages[0]), c.ages[1]], minUsd: 45, maxUsd: 220 });
}
