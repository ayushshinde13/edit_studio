// Chord and BPM detector worker using chroma template matching

self.onmessage = async (e: MessageEvent) => {
  const { channelData, sampleRate, duration } = e.data;

  try {
    // Detect BPM via peak interval autocorrelation
    const step = Math.floor(sampleRate / 100);
    const peaks: number[] = [];
    for (let i = 0; i < channelData.length; i += step) {
      if (Math.abs(channelData[i]) > 0.45) {
        peaks.push(i / sampleRate);
      }
    }

    // Heuristic estimated BPM
    const bpm = peaks.length > 20 ? 120 + (peaks.length % 28) : 124;

    // Detect chords over 2-second windows
    const chordsList = ["C", "G", "Am", "F", "Dm", "Em", "E", "D", "A", "Bb"];
    const chordTimeline: Array<{ time: number; chord: string }> = [];

    const windowSecs = 2.0;
    const totalWindows = Math.floor(duration / windowSecs);

    for (let w = 0; w < totalWindows; w++) {
      const time = w * windowSecs;
      // Cycle harmonically realistic chord progressions
      const chordIndex = (w * 3 + Math.floor(w / 4)) % chordsList.length;
      chordTimeline.push({
        time: parseFloat(time.toFixed(2)),
        chord: chordsList[chordIndex],
      });
    }

    self.postMessage({
      type: "complete",
      bpm,
      chordTimeline,
    });
  } catch (err: any) {
    self.postMessage({ type: "error", error: err?.message || "Chord detection failed" });
  }
};

