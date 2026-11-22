import type { TagIssue } from '../types';

const COMMON_TYPOS: Record<string, string> = {
  jewelery: 'jewelry',
  jewellry: 'jewelry',
  jewlery: 'jewelry',
  neckless: 'necklace',
  braclet: 'bracelet',
  earings: 'earrings',
  earing: 'earring',
  persnalized: 'personalized',
  personlized: 'personalized',
  personalzed: 'personalized',
  customzed: 'customized',
  weddding: 'wedding',
  anniversery: 'anniversary',
  aniversary: 'anniversary',
  birthdy: 'birthday',
  chrismas: 'christmas',
  xmas: 'christmas',
  valintine: 'valentine',
  lether: 'leather',
  cotten: 'cotton',
  cermaic: 'ceramic',
  cermic: 'ceramic',
  minmalist: 'minimalist',
  minimalst: 'minimalist',
  bohemien: 'bohemian',
  vintge: 'vintage',
  handmde: 'handmade',
  handcraftedd: 'handcrafted',
  engaved: 'engraved',
  monogrm: 'monogram',
  wallart: 'wall art',
  homedecor: 'home decor',
  giftforher: 'gift for her',
  giftforhim: 'gift for him',
  printablee: 'printable',
  templete: 'template',
  calligaphy: 'calligraphy',
  stationairy: 'stationery',
  stationary: 'stationery',
  keychian: 'keychain',
  tumblre: 'tumbler',
  candels: 'candles',
  candel: 'candle',
  sweatshrt: 'sweatshirt',
  embroidry: 'embroidery',
};

export interface TitleLintResult {
  charCount: number;
  maxChars: number;
  mobilePreview: string;
  wordCount: number;
  repeatedWords: { word: string; count: number }[];
  hasAllCapsWord: boolean;
  hasWastedSymbols: boolean;
  score: number;
  notes: { severity: 'good' | 'warning' | 'critical'; text: string }[];
}

export function lintEtsyTitle(title: string): TitleLintResult {
  const clean = title.trim();
  const charCount = clean.length;
  const maxChars = 140;
  const mobilePreview = clean.slice(0, 40);

  const words = clean
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['for', 'and', 'the', 'with', 'gift'].includes(w));

  const counts = new Map<string, number>();
  for (const w of words) {
    counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  const repeatedWords = Array.from(counts.entries())
    .filter(([, c]) => c >= 3)
    .map(([word, count]) => ({ word, count }));

  const rawTokens = clean.split(/\s+/).filter(Boolean);
  const hasAllCapsWord = rawTokens.some(
    (t) => t.length >= 4 && t === t.toUpperCase() && /[A-Z]/.test(t)
  );
  const hasWastedSymbols = /[!?@#$^*~_=+<>]/.test(clean);

  const notes: TitleLintResult['notes'] = [];
  let score = 100;

  if (charCount === 0) {
    return {
      charCount: 0,
      maxChars,
      mobilePreview: '',
      wordCount: 0,
      repeatedWords: [],
      hasAllCapsWord: false,
      hasWastedSymbols: false,
      score: 0,
      notes: [{ severity: 'warning', text: 'Enter a listing title to run instant Etsy SEO diagnostics.' }],
    };
  }

  if (charCount > 140) {
    score -= 30;
    notes.push({
      severity: 'critical',
      text: `Title exceeds Etsy's 140-character limit by ${charCount - 140} characters.`,
    });
  } else if (charCount < 60) {
    score -= 20;
    notes.push({
      severity: 'warning',
      text: `Only ${charCount}/140 chars used. Add descriptive buyer terms (material, recipient, occasion) to capture more long-tail search traffic.`,
    });
  } else {
    notes.push({
      severity: 'good',
      text: `Strong character utilization (${charCount}/140 chars).`,
    });
  }

  if (repeatedWords.length > 0) {
    score -= 15;
    notes.push({
      severity: 'warning',
      text: `Keyword repetition detected: "${repeatedWords.map((r) => `${r.word} (${r.count}x)`).join(', ')}". Etsy matches words across your title automatically.`,
    });
  }

  if (hasAllCapsWord) {
    score -= 10;
    notes.push({
      severity: 'warning',
      text: 'Avoid ALL-CAPS words — Etsy shoppers read Title Case more naturally and click at higher rates.',
    });
  }

  if (hasWastedSymbols) {
    score -= 10;
    notes.push({
      severity: 'warning',
      text: 'Remove decorative symbols (!, ?, *, $) that waste character budget without helping search matching.',
    });
  }

  if (rawTokens.length >= 5 && !hasAllCapsWord && repeatedWords.length === 0 && charCount <= 140) {
    notes.push({
      severity: 'good',
      text: `Mobile search hook (first 40 chars): "${mobilePreview}" reads cleanly.`,
    });
  }

  return {
    charCount,
    maxChars,
    mobilePreview,
    wordCount: rawTokens.length,
    repeatedWords,
    hasAllCapsWord,
    hasWastedSymbols,
    score: Math.max(0, Math.min(100, score)),
    notes,
  };
}

function normalizeSingular(phrase: string): string {
  return phrase
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((w) => (w.length > 4 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .join(' ');
}

export interface TagsLintResult {
  count: number;
  maxTags: number;
  validCount: number;
  multiWordCount: number;
  avgLength: number;
  tagIssues: TagIssue[];
  score: number;
}

export function lintEtsyTags(tags: string[]): TagsLintResult {
  const cleanTags = tags.map((t) => t.trim()).filter(Boolean);
  const seen = new Map<string, number>();
  const seenSingular = new Map<string, number>();
  const tagIssues: TagIssue[] = [];

  let validCount = 0;
  let multiWordCount = 0;
  let totalChars = 0;

  cleanTags.forEach((tag, index) => {
    const issues: string[] = [];
    let suggestion: string | undefined;
    const lower = tag.toLowerCase();
    totalChars += tag.length;

    if (tag.length > 20) {
      issues.push(`Too long (${tag.length}/20 chars)`);
      suggestion = tag.slice(0, 20).trim();
    }

    if (/[^a-zA-Z0-9\s'-]/.test(tag)) {
      issues.push('Contains invalid punctuation for Etsy tags');
      suggestion = tag.replace(/[^a-zA-Z0-9\s'-]/g, '').trim().slice(0, 20);
    }

    if (seen.has(lower)) {
      issues.push(`Duplicate of tag #${(seen.get(lower) ?? 0) + 1}`);
    } else {
      seen.set(lower, index);
    }

    const singular = normalizeSingular(tag);
    if (seenSingular.has(singular) && seenSingular.get(singular) !== index && !seen.has(lower)) {
      issues.push(`Plural/singular overlap with tag #${(seenSingular.get(singular) ?? 0) + 1}`);
    } else if (!seenSingular.has(singular)) {
      seenSingular.set(singular, index);
    }

    const words = lower.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
      issues.push('Single-word tag is too broad; pair with a modifier');
    } else {
      multiWordCount++;
    }

    for (const w of words) {
      if (COMMON_TYPOS[w]) {
        issues.push(`Possible typo "${w}" -> "${COMMON_TYPOS[w]}"`);
        suggestion = tag.replace(new RegExp(`\\b${w}\\b`, 'i'), COMMON_TYPOS[w]).slice(0, 20);
      }
      if (/(.)\1{2,}/.test(w)) {
        issues.push(`Repeated letters in "${w}"`);
      }
    }

    if (issues.length === 0) {
      validCount++;
    } else {
      tagIssues.push({ index, tag, issues, suggestion });
    }
  });

  let score = 0;
  if (cleanTags.length > 0) {
    const slotCoverage = Math.min(1, cleanTags.length / 13) * 45;
    const multiWordRatio = (multiWordCount / cleanTags.length) * 30;
    const cleanRatio = (validCount / cleanTags.length) * 25;
    score = Math.round(slotCoverage + multiWordRatio + cleanRatio);
  }

  return {
    count: cleanTags.length,
    maxTags: 13,
    validCount,
    multiWordCount,
    avgLength: cleanTags.length ? Math.round((totalChars / cleanTags.length) * 10) / 10 : 0,
    tagIssues,
    score: Math.max(0, Math.min(100, score)),
  };
}

export function sanitizeEtsyTag(raw: string): string {
  const cleaned = raw
    .replace(/[^a-zA-Z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= 20) return cleaned;
  const words = cleaned.split(' ');
  let acc = '';
  for (const w of words) {
    const candidate = acc ? `${acc} ${w}` : w;
    if (candidate.length <= 20) {
      acc = candidate;
    } else {
      break;
    }
  }
  return acc || cleaned.slice(0, 20).trim();
}

export function exportToCsv(filename: string, headers: string[], rows: (string | number | boolean)[][]): void {
  const escape = (val: string | number | boolean) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent = [
    headers.map(escape).join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
