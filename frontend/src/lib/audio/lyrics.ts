export interface SyncedLyricLine {
  time: number;
  text: string;
}

export interface SongLyricsResult {
  trackName: string;
  artistName: string;
  plainLyrics: string;
  syncedLyrics: string;
  lines: SyncedLyricLine[];
  // Dual-script options (Hinglish & Hindi)
  hasHindiOption: boolean;
  hinglishPlainLyrics?: string;
  hinglishSyncedLyrics?: string;
  hinglishLines?: SyncedLyricLine[];
  hindiPlainLyrics?: string;
  hindiSyncedLyrics?: string;
  hindiLines?: SyncedLyricLine[];
}

/**
 * Parses LRC format strings like "[00:15.20] Hello world" into timestamped lines.
 */
export function parseLrc(lrc: string): SyncedLyricLine[] {
  if (!lrc) return [];
  const lines: SyncedLyricLine[] = [];
  const rawLines = lrc.split("\n");
  const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d{1,3})?)\]/g;

  for (const line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    const timestamps: number[] = [];

    while ((match = timeRegex.exec(trimmed)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      timestamps.push(minutes * 60 + seconds);
      lastIndex = timeRegex.lastIndex;
    }

    const text = trimmed.slice(lastIndex).trim();
    if (timestamps.length > 0 && text) {
      for (const t of timestamps) {
        lines.push({ time: t, text });
      }
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

/**
 * Checks if a string contains any Devanagari characters.
 */
export function containsDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text || "");
}

const INDEPENDENT_VOWELS: Record<string, string> = {
  "\u0905": "a", "\u0906": "aa", "\u0907": "i", "\u0908": "ee", "\u0909": "u", "\u090A": "oo",
  "\u090B": "ri", "\u090F": "e", "\u0910": "ai", "\u0913": "o", "\u0914": "au"
};

const MATRAS: Record<string, string> = {
  "\u093E": "aa", "\u093F": "i", "\u0940": "ee", "\u0941": "u", "\u0942": "oo",
  "\u0943": "ri", "\u0947": "e", "\u0948": "ai", "\u094B": "o", "\u094C": "au"
};

const CONSONANTS: Record<string, string> = {
  "\u0915": "k", "\u0916": "kh", "\u0917": "g", "\u0918": "gh", "\u0919": "ng",
  "\u091A": "ch", "\u091B": "chh", "\u091C": "j", "\u091D": "jh", "\u091E": "ny",
  "\u091F": "t", "\u0920": "th", "\u0921": "d", "\u0922": "dh", "\u0923": "n",
  "\u0924": "t", "\u0925": "th", "\u0926": "d", "\u0927": "dh", "\u0928": "n",
  "\u092A": "p", "\u092B": "ph", "\u092C": "b", "\u092D": "bh", "\u092E": "m",
  "\u092F": "y", "\u0930": "r", "\u0932": "l", "\u0935": "v",
  "\u0936": "sh", "\u0937": "sh", "\u0938": "s", "\u0939": "h",
  "क़": "q", "ख़": "kh", "ग़": "g", "ज़": "z", "ड़": "r", "ढ़": "rh", "फ़": "f"
};

/**
 * Transliterates Devanagari Hindi text to clean, natural Hinglish (Roman script).
 * Preserves timestamps in LRC format if present.
 */
export function devanagariToHinglish(text: string): string {
  if (!text || !containsDevanagari(text)) return text;

  // Normalize decomposed nuktas
  let s = text
    .replace(/\u0915\u093C/g, "क़")
    .replace(/\u0916\u093C/g, "ख़")
    .replace(/\u0917\u093C/g, "ग़")
    .replace(/\u091C\u093C/g, "ज़")
    .replace(/\u0921\u093C/g, "ड़")
    .replace(/\u0922\u093C/g, "ढ़")
    .replace(/\u092B\u093C/g, "फ़")
    .replace(/।/g, ".")
    .replace(/॥/g, ".");

  let result = "";
  const len = s.length;

  for (let i = 0; i < len; i++) {
    const ch = s[i];
    const next = s[i + 1] || "";

    if (INDEPENDENT_VOWELS[ch]) {
      result += INDEPENDENT_VOWELS[ch];
    } else if (CONSONANTS[ch]) {
      const base = CONSONANTS[ch];
      if (next === "\u094D") {
        // Halant (virama)
        result += base;
        i++;
      } else if (MATRAS[next]) {
        result += base + MATRAS[next];
        i++;
      } else if (next === "\u0902" || next === "\u0901") {
        result += base + "an";
        i++;
      } else {
        const isEndOfWord = !next || /[\s\.,\-!?'"()\[\]{}:;\/]/.test(next);
        result += isEndOfWord ? base : base + "a";
      }
    } else if (MATRAS[ch]) {
      result += MATRAS[ch];
    } else if (ch === "\u0902" || ch === "\u0901") {
      result += "n";
    } else if (ch === "\u0903") {
      result += "h";
    } else if (ch === "\u094D") {
      // skip lone halant
    } else {
      result += ch;
    }
  }

  return result
    .replace(/aee/g, "aayi")
    .replace(/aaye/g, "aaye")
    .replace(/\bphir\b/gi, "phir")
    .replace(/\bhum\b/gi, "hum");
}

/**
 * Cleans audio filename to extract likely song and artist name.
 */
export function cleanSongQuery(raw: string): string {
  return raw
    .replace(/\.(mp3|wav|ogg|m4a|aac|flac|webm|mp4|opus)$/i, "")
    .replace(/^\d+[\s\.\-_]+/, "") // Remove leading track numbers e.g. "01 - " or "02. "
    .replace(/[\(\[\{].*?[\)\]\}]/g, "") // remove parentheticals like (Official Video), [320kbps]
    .replace(/(official\s*(music\s*)?video|official\s*audio|lyrics?|remaster(ed)?|hd|4k|ft\..*|feat\..*|\b\d+kbps\b|pagalworld|naasongs|djmaza|pendujatt)/gi, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Searches and fetches real lyrics from lrclib.net (free, open, global lyrics database).
 * Defaults to Hinglish for Indian/Bollywood songs, while providing both Hinglish and Hindi options,
 * and maintains English for English songs.
 */
export async function fetchSongLyrics(query: string): Promise<SongLyricsResult | null> {
  const cleaned = cleanSongQuery(query);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleaned)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const isRomanized = (item: any) => {
      const sample = (item.plainLyrics || item.syncedLyrics || "").slice(0, 400);
      return !containsDevanagari(sample);
    };

    // 1. Best Romanized match (Hinglish or English)
    const romanizedMatch =
      data.find((item: any) => item.syncedLyrics && item.plainLyrics && isRomanized(item)) ||
      data.find((item: any) => item.syncedLyrics && isRomanized(item)) ||
      data.find((item: any) => item.plainLyrics && isRomanized(item));

    // 2. Best Devanagari Hindi match
    const hindiMatch =
      data.find((item: any) => item.syncedLyrics && item.plainLyrics && !isRomanized(item)) ||
      data.find((item: any) => item.syncedLyrics && !isRomanized(item)) ||
      data.find((item: any) => item.plainLyrics && !isRomanized(item));

    // Is there a Hindi option?
    const hasHindiOption = !!hindiMatch || (!!romanizedMatch && containsDevanagari(cleaned));

    // Prepare Hinglish data
    let hinglishPlain = "";
    let hinglishSynced = "";
    let hinglishLines: SyncedLyricLine[] = [];

    if (romanizedMatch) {
      hinglishPlain = (romanizedMatch.plainLyrics || "").trim();
      hinglishSynced = (romanizedMatch.syncedLyrics || "").trim();
      hinglishLines = parseLrc(hinglishSynced);
    } else if (hindiMatch) {
      // Auto-transliterate Devanagari to Hinglish fallback
      const rawPlain = (hindiMatch.plainLyrics || "").trim();
      const rawSynced = (hindiMatch.syncedLyrics || "").trim();
      hinglishPlain = devanagariToHinglish(rawPlain);
      hinglishSynced = devanagariToHinglish(rawSynced);
      hinglishLines = parseLrc(hinglishSynced);
    }

    // Prepare Hindi Devanagari data
    let hindiPlain = "";
    let hindiSynced = "";
    let hindiLines: SyncedLyricLine[] = [];

    if (hindiMatch) {
      hindiPlain = (hindiMatch.plainLyrics || "").trim();
      hindiSynced = (hindiMatch.syncedLyrics || "").trim();
      hindiLines = parseLrc(hindiSynced);
    }

    // Default choice is Hinglish (or original Romanized/English)
    const defaultTrackName =
      romanizedMatch?.trackName || hindiMatch?.trackName || cleaned;
    const defaultArtistName =
      romanizedMatch?.artistName || hindiMatch?.artistName || "";

    const activePlain = hinglishPlain || hindiPlain;
    const activeSynced = hinglishSynced || hindiSynced;
    const activeLines = hinglishLines.length > 0 ? hinglishLines : hindiLines;

    return {
      trackName: defaultTrackName,
      artistName: defaultArtistName,
      plainLyrics: activePlain,
      syncedLyrics: activeSynced,
      lines: activeLines,
      hasHindiOption,
      hinglishPlainLyrics: hinglishPlain,
      hinglishSyncedLyrics: hinglishSynced,
      hinglishLines,
      hindiPlainLyrics: hindiPlain,
      hindiSyncedLyrics: hindiSynced,
      hindiLines,
    };
  } catch (err) {
    console.warn("Song lyrics lookup exception:", err);
    return null;
  }
}
