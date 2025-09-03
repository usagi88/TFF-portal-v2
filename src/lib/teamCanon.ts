// src/lib/teamCanon.ts

// --- The 26 canonical team labels you want to display (edit if needed) ---
export const CANONICAL_TEAMS: string[] = [
  'Time will Tel 1XI','Time will Tel 2XI',
  'Second Wirst 2XI',
  "What's the Wirtz that could happen 1XI","What's the Wirtz that could happen 2XI",
  'Lazio FC 1XI','Lazio FC 2XI',
  'MOBLANDERSON 1XI','MOBLANDERSON 2XI',
  'Porro Ball Defending 1XI',
  'World Club Chumpions 1XI','World Club Chumpions 2XI',
  'Middle Earth FC 1XI','Middle Earth FC 2XI',
  'Ruben Murray 2XI',
  "Pecorino’s 1XI","Pecorino’s 2XI",
  "Jimmy's Jokers 1XI","Jimmy's Jokers 2XI",
  'Smoke AI 1XI','Smoke AI 2XI',
  'Always the Wright One 1XI','Always the Wright One 2XI',
  'Hugo First 1XI',
  'Chicken Cunha 1XI',
  'Thomas the Frank engine 2XI',
];

// If your raw results use slightly different strings, hard-map them here.
// Left = raw string exactly as it appears in results.json; Right = one of CANONICAL_TEAMS.
export const TEAM_ALIAS_MAP: Record<string, string> = {
  // Time will Tel
  "1XI - Time will Tel": "Time will Tel 1XI",
  "2XI - Time will Tel": "Time will Tel 2XI",

  // Second Wirst
  "2XI - Second Wirst": "Second Wirst 2XI",

  // What's the Wirtz that could happen
  "1XI - What's the Wirtz that could happen": "What's the Wirtz that could happen 1XI",
  "2XI - What's the Wirtz that could happen": "What's the Wirtz that could happen 2XI",

  // Lazio FC
  "1XI - Lazio FC": "Lazio FC 1XI",
  "2XI - Lazio FC": "Lazio FC 2XI",

  // MOBLANDERSON
  "1XI - MOBLANDERSON": "MOBLANDERSON 1XI",
  "2XI - MOBLANDERSON": "MOBLANDERSON 2XI",

  // Porro Ball Defending
  "1XI - Porro Ball Defending": "Porro Ball Defending 1XI",

  // World Club Chumpions
  "1XI - World Club Chumpions": "World Club Chumpions 1XI",
  "2XI - World Club Chumpions": "World Club Chumpions 2XI",

  // Middle Earth FC
  "1XI - Middle Earth FC": "Middle Earth FC 1XI",
  "2XI - Middle Earth FC": "Middle Earth FC 2XI",

  // Ruben Murray
  "2XI - Ruben Murray": "Ruben Murray 2XI",

  // Pecorino’s
  "1XI - Pecorino’s": "Pecorino’s 1XI",
  "2XI - Pecorino’s": "Pecorino’s 2XI",

  // Jimmy's Jokers
  "1XI - Jimmy's Jokers": "Jimmy's Jokers 1XI",
  "2XI - Jimmy's Jokers": "Jimmy's Jokers 2XI",

  // Smoke AI
  "1XI - Smoke AI": "Smoke AI 1XI",
  "2XI - Smoke AI": "Smoke AI 2XI",

  // Always the Wright One
  "1XI - Always the Wright One": "Always the Wright One 1XI",
  "2XI - Always the Wright One": "Always the Wright One 2XI",

  // Hugo First
  "1XI - Hugo First": "Hugo First 1XI",

  // Chicken Cunha
  "1XI - Chicken Cunha": "Chicken Cunha 1XI",

  // Thomas the Frank engine
  "2XI - Thomas the Frank engine": "Thomas the Frank engine 2XI",
};


// -------- Normaliser helpers --------
const clean = (s: string): string =>
  s.toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const detectXI = (raw: string): '1XI' | '2XI' | null => {
  const r = clean(raw);
  if (/\b2(?:xi|nd|s|'s| 11)?\b/.test(r)) return '2XI';
  if (/\b1(?:xi|st|s|'s| 11)?\b/.test(r)) return '1XI';
  return null;
};

const baseOf = (label: string): string => label.replace(/\s+(1XI|2XI)$/i, '').trim().toLowerCase();

type CanonMeta = { label: string; base: string; xi: '1XI' | '2XI'; k: string };
const CANON_META: CanonMeta[] = CANONICAL_TEAMS.map((c) => ({
  label: c,
  base: baseOf(c),
  xi: c.endsWith('2XI') ? '2XI' : '1XI',
  k: clean(c),
}));

export function toCanonical(raw: string | undefined | null): string | null {
  if (!raw) return null;

  // 1) exact alias
  const alias = TEAM_ALIAS_MAP[raw];
  if (alias) return alias;

  const r = clean(raw);

  // 2) exact canonical after cleaning
  const direct = CANON_META.find((x) => x.k === r);
  if (direct) return direct.label;

  // 3) tolerant: find the canonical whose base name appears & XI matches (if detectable)
  const xi = detectXI(raw);
  const candidates = xi ? CANON_META.filter((x) => x.xi === xi) : CANON_META;

  let best: { label: string; baseLen: number } | null = null;
  for (const c of candidates) {
    if (r.includes(c.base)) {
      if (!best || c.base.length > best.baseLen) best = { label: c.label, baseLen: c.base.length };
    }
  }
  return best?.label ?? null;
}
