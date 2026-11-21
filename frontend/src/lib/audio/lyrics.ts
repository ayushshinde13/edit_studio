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
 */
export async function fetchSongLyrics(query: string): Promise<SongLyricsResult | null> {
  const cleaned = cleanSongQuery(query);
  if (!cleaned || cleaned.length < 2) return null;

  try {
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(cleaned)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    // Prioritize results that have BOTH syncedLyrics and plainLyrics for live karaoke sync
    const best =
      data.find((item: any) => item.syncedLyrics && item.plainLyrics) ||
      data.find((item: any) => item.syncedLyrics) ||
      data.find((item: any) => item.plainLyrics) ||
      data[0];

    const plain = (best.plainLyrics || "").trim();
    const synced = (best.syncedLyrics || "").trim();
    const lines = parseLrc(synced);

    return {
      trackName: best.trackName || best.name || cleaned,
      artistName: best.artistName || "",
      plainLyrics: plain || lines.map((l) => l.text).join("\n"),
      syncedLyrics: synced,
      lines,
    };
  } catch (err) {
    console.warn("Song lyrics lookup exception:", err);
    return null;
  }
}
