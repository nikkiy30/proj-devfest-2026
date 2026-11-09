export const categories = [
  { id: "work", label: "バイト・仕事" },
  { id: "love", label: "恋愛" },
  { id: "study", label: "勉強・大学" },
  { id: "friends", label: "友人・約束" },
  { id: "general", label: "その他" },
] as const;

export type Category = (typeof categories)[number]["id"];
export type CategoryChoice = Category | "auto";

export const replies: Record<Category, readonly string[]> = {
  work: [
    "その職場に血と汗と涙を捧げるくらいなら、献血にしません？",
    "血も涙もない職場より、あなたの血を必要としている人へ。",
    "残業で血をすり減らすより、献血で血を役立てたいものですね。",
    "給料に見合わない献身より、血の通った社会貢献を。",
  ],
  love: [
    "届かない愛情より、届けられる血液。",
    "恋人に血迷うくらいなら、献血で血を分けましょう。",
    "好きな人には求められなくても、あなたの血を必要としている人はいます。",
    "恋愛で血迷うより、献血で誰かの役に立ちませんか。",
  ],
  study: [
    "単位のために血を吐く思いをするくらいなら、献血の方が健全です。",
    "その課題、血の気が引くほど大変そうですね。献血の話はまた今度にしましょう。",
    "課題に血眼になるくらいなら、献血で血を役立てませんか？",
    "単位は分けられませんが、血なら分けられます。",
    "単位を落とすくらいなら、献血ルームに寄り道する方がまだマシかもしれません。",
  ],
  friends: [
    "ドタキャンで空いた時間、献血という使い道もあります。",
    "遅刻する友人を待つより、献血ルームで順番を待つ方が有意義かもしれません。",
    "血も涙もない友達より、あなたの血を必要としている誰かへ。",
  ],
  general: ["血の気が多いようですね。献血をご案内します。"],
};

const keywords: Record<Exclude<Category, "general">, readonly string[]> = {
  work: [
    "バイト",
    "仕事",
    "職場",
    "上司",
    "残業",
    "給料",
    "シフト",
    "会社",
    "同僚",
    "店長",
  ],
  love: [
    "恋愛",
    "恋人",
    "彼氏",
    "彼女",
    "好きな人",
    "片思い",
    "失恋",
    "デート",
    "告白",
    "浮気",
  ],
  study: [
    "勉強",
    "大学",
    "単位",
    "課題",
    "授業",
    "試験",
    "テスト",
    "レポート",
    "ゼミ",
    "卒論",
  ],
  friends: ["友人", "友達", "約束", "ドタキャン", "遅刻", "待ち合わせ", "親友"],
};

// Transparent local rules, not semantic understanding. Ties and no matches
// deliberately fall back to the general category instead of guessing.
export function resolveCategory(
  choice: CategoryChoice,
  text: string,
): Category {
  if (choice !== "auto") return choice;
  const normalized = text.normalize("NFKC").toLowerCase();
  let best: Category = "general";
  let bestCount = 0;
  for (const category of ["work", "love", "study", "friends"] as const) {
    const count = keywords[category].filter((word) =>
      normalized.includes(word),
    ).length;
    if (count > bestCount) {
      best = category;
      bestCount = count;
    } else if (count > 0 && count === bestCount) {
      best = "general";
    }
  }
  return best;
}

// A playful visual score, never a medical/psychological measurement. Weight
// by elapsed time in the caller so refresh rate does not affect the result.
export function playfulScore(averageVolume: number): number {
  return Math.round(58 + Math.min(1, Math.max(0, averageVolume)) * 41);
}

export function chooseReply(category: Category): string {
  const choices = replies[category];
  const random = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
  return choices[Math.floor(random * choices.length)];
}
