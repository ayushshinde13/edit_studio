// Pitch Transposition & Playback Speed helpers

export function semitonesToPlaybackRate(semitones: number): number {
  return Math.pow(2, semitones / 12);
}

export function semitonesToCents(semitones: number): number {
  return semitones * 100;
}

export const TEMPO_PRESETS = [0.75, 0.9, 1.0, 1.1, 1.25, 1.5];

export const CHORD_ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function transposeChord(chord: string, semitones: number): string {
  if (!chord || semitones === 0) return chord;
  
  let root = chord;
  let quality = "";
  
  if (chord.length > 1 && (chord[1] === "#" || chord[1] === "b")) {
    root = chord.substring(0, 2);
    quality = chord.substring(2);
  } else {
    root = chord.substring(0, 1);
    quality = chord.substring(1);
  }

  // Normalize flats to sharps for lookup
  const flatMap: Record<string, string> = {
    Db: "C#",
    Eb: "D#",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",
  };
  if (flatMap[root]) root = flatMap[root];

  const idx = CHORD_ROOTS.indexOf(root);
  if (idx === -1) return chord;

  const newIdx = (idx + semitones + 24) % 12;
  return CHORD_ROOTS[newIdx] + quality;
}

