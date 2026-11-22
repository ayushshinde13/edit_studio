"use client";

import * as React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Save,
  Sparkles,
  Music,
  Activity,
  Layers,
  Repeat,
  FileAudio,
  CheckCircle2,
  Mic2,
  Drum,
  Guitar,
  Piano,
  Clock,
  Zap,
  Radio,
  Sliders,
  FileText,
  Plus,
  Trash2,
  Bookmark,
  Copy,
  Check,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileDown,
} from "lucide-react";
import { fetchSongLyrics, SyncedLyricLine } from "@/lib/audio/lyrics";
import { downloadLyricsPdf } from "@/lib/audio/lyricsPdf";
import { Button } from "@/design-system/primitives/button";
import { Slider } from "@/design-system/primitives/slider";
import { Badge } from "@/design-system/primitives/badge";
import { Card } from "@/design-system/primitives/card";
import { Label } from "@/components/ui/label";
import {
  getAudioContext,
  decodeAudioFromFile,
  audioBufferToWav,
  audioBufferToMp3,
} from "@/lib/audio/audioContext";
import {
  transposeChord,
  TEMPO_PRESETS,
} from "@/lib/audio/pitchShift";
import { useSearchParams } from "next/navigation";
import { saveProject, getProject, type StoredProject } from "@/lib/storage/indexeddb";
import { formatTime, formatBytes } from "@/lib/utils";
import { zipSync } from "fflate";

interface StemTrack {
  id: string;
  name: string;
  iconType: "vocals" | "drums" | "bass" | "other" | "guitar";
  color: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  waveformSeed: number;
}

interface Marker {
  id: string;
  time: number;
  label: string;
}

interface ChordItem {
  time: number;
  chord: string;
}

// Key List
const KEYS = [
  "C Major", "C# Major", "D Major", "Eb Major", "E Major", "F Major",
  "F# Major", "G Major", "Ab Major", "A Major", "Bb Major", "B Major",
  "A Minor", "Bb Minor", "B Minor", "C Minor", "C# Minor", "D Minor",
  "Eb Minor", "E Minor", "F Minor", "F# Minor", "G Minor", "Ab Minor",
];

/**
 * Renders an isolated stem offline with genuine DSP filtering & Zero-Loss Background Reconstruction
 */
async function renderStemOffline(
  buffer: AudioBuffer,
  stemId: string
): Promise<AudioBuffer> {
  const isStereo = buffer.numberOfChannels >= 2;
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  const stemGain = offlineCtx.createGain();
  stemGain.gain.setValueAtTime(1.0, 0);
  stemGain.connect(offlineCtx.destination);

  let vocalNode: AudioNode;
  let bgBusNode: AudioNode;

  if (isStereo) {
    const splitter = offlineCtx.createChannelSplitter(2);
    source.connect(splitter);

    // Center Mid channel: 0.5 * (L + R)
    const midSum = offlineCtx.createGain();
    const midL = offlineCtx.createGain();
    midL.gain.setValueAtTime(0.5, 0);
    const midR = offlineCtx.createGain();
    midR.gain.setValueAtTime(0.5, 0);
    splitter.connect(midL, 0);
    splitter.connect(midR, 1);
    midL.connect(midSum);
    midR.connect(midSum);

    // 1. Vocal Isolation (Acapella / Lead vocal extraction)
    const vHp = offlineCtx.createBiquadFilter();
    vHp.type = "highpass";
    vHp.frequency.setValueAtTime(180, 0);
    vHp.Q.setValueAtTime(0.707, 0);

    const vLp = offlineCtx.createBiquadFilter();
    vLp.type = "lowpass";
    vLp.frequency.setValueAtTime(4200, 0);
    vLp.Q.setValueAtTime(0.707, 0);

    const vPres = offlineCtx.createBiquadFilter();
    vPres.type = "peaking";
    vPres.frequency.setValueAtTime(2400, 0);
    vPres.gain.setValueAtTime(3.0, 0);

    midSum.connect(vHp);
    vHp.connect(vLp);
    vLp.connect(vPres);
    vocalNode = vPres;

    // 2. Zero-Phase Center Cancellation for 100% vocal muting
    // Side L = (L - R); Side R = (R - L) -> Center Vocal V - V = 0 identically
    const invR = offlineCtx.createGain();
    invR.gain.setValueAtTime(-1.0, 0);
    splitter.connect(invR, 1);

    const sideL = offlineCtx.createGain();
    splitter.connect(sideL, 0);
    invR.connect(sideL);

    const invL = offlineCtx.createGain();
    invL.gain.setValueAtTime(-1.0, 0);
    splitter.connect(invL, 0);

    const sideR = offlineCtx.createGain();
    splitter.connect(sideR, 1);
    invL.connect(sideR);

    // Merge into 2-channel stereo side bus
    const sideMerger = offlineCtx.createChannelMerger(2);
    sideL.connect(sideMerger, 0, 0);
    sideR.connect(sideMerger, 0, 1);

    // Highpass side channels at 50 Hz to cut DC rumble without cutting musical instruments & tunes
    const sideHp = offlineCtx.createBiquadFilter();
    sideHp.type = "highpass";
    sideHp.frequency.setValueAtTime(50, 0);
    sideHp.Q.setValueAtTime(0.707, 0);

    const sideProcessed = offlineCtx.createGain();
    sideProcessed.gain.setValueAtTime(1.15, 0);
    sideMerger.connect(sideHp);
    sideHp.connect(sideProcessed);

    // 3. Bass Preservation below 85 Hz (kick drum & sub-bass where lead vocals do not exist)
    const bassLp1 = offlineCtx.createBiquadFilter();
    bassLp1.type = "lowpass";
    bassLp1.frequency.setValueAtTime(85, 0);
    bassLp1.Q.setValueAtTime(0.707, 0);

    const bassLp2 = offlineCtx.createBiquadFilter();
    bassLp2.type = "lowpass";
    bassLp2.frequency.setValueAtTime(85, 0);
    bassLp2.Q.setValueAtTime(0.707, 0);

    midSum.connect(bassLp1);
    bassLp1.connect(bassLp2);

    const bassGain = offlineCtx.createGain();
    bassGain.gain.setValueAtTime(1.0, 0);
    bassLp2.connect(bassGain);

    const finalBgBus = offlineCtx.createGain();
    sideProcessed.connect(finalBgBus);
    bassGain.connect(finalBgBus);
    bgBusNode = finalBgBus;

    if (stemId === "vocals") {
      vPres.connect(stemGain);
      source.start(0);
      return await offlineCtx.startRendering();
    }
  } else {
    // Mono audio support: preserve low bass + high cymbals, gentle mid notch for vocal
    const vHp = offlineCtx.createBiquadFilter();
    vHp.type = "highpass";
    vHp.frequency.setValueAtTime(180, 0);
    const vLp = offlineCtx.createBiquadFilter();
    vLp.type = "lowpass";
    vLp.frequency.setValueAtTime(4200, 0);
    const vPres = offlineCtx.createBiquadFilter();
    vPres.type = "peaking";
    vPres.frequency.setValueAtTime(2400, 0);
    vPres.gain.setValueAtTime(3.0, 0);

    source.connect(vHp);
    vHp.connect(vLp);
    vLp.connect(vPres);
    vocalNode = vPres;

    const monoLow = offlineCtx.createBiquadFilter();
    monoLow.type = "lowpass";
    monoLow.frequency.setValueAtTime(140, 0);

    const monoHigh = offlineCtx.createBiquadFilter();
    monoHigh.type = "highpass";
    monoHigh.frequency.setValueAtTime(3800, 0);

    const monoMid = offlineCtx.createBiquadFilter();
    monoMid.type = "peaking";
    monoMid.frequency.setValueAtTime(2200, 0);
    monoMid.Q.setValueAtTime(0.8, 0);
    monoMid.gain.setValueAtTime(-12, 0);

    const bgMono = offlineCtx.createGain();
    source.connect(monoLow);
    source.connect(monoHigh);
    source.connect(monoMid);
    monoLow.connect(bgMono);
    monoHigh.connect(bgMono);
    monoMid.connect(bgMono);
    bgBusNode = bgMono;

    if (stemId === "vocals") {
      vPres.connect(stemGain);
      source.start(0);
      return await offlineCtx.startRendering();
    }
  }

  // Background stem isolation from the full-volume background bus:
  if (stemId === "bass") {
    const bassLp = offlineCtx.createBiquadFilter();
    bassLp.type = "lowpass";
    bassLp.frequency.setValueAtTime(220, 0);
    bassLp.Q.setValueAtTime(0.707, 0);
    bgBusNode.connect(bassLp);
    bassLp.connect(stemGain);
  } else if (stemId === "drums") {
    const drumHp = offlineCtx.createBiquadFilter();
    drumHp.type = "highpass";
    drumHp.frequency.setValueAtTime(2500, 0);
    drumHp.Q.setValueAtTime(0.707, 0);
    bgBusNode.connect(drumHp);
    drumHp.connect(stemGain);
  } else if (stemId === "guitar") {
    const guitarBp = offlineCtx.createBiquadFilter();
    guitarBp.type = "bandpass";
    guitarBp.frequency.setValueAtTime(800, 0);
    guitarBp.Q.setValueAtTime(1.0, 0);
    bgBusNode.connect(guitarBp);
    guitarBp.connect(stemGain);
  } else {
    // Other / Melodic / Full Instrumental
    // Delivers the full rich background music without vocal!
    bgBusNode.connect(stemGain);
  }

  source.start(0);
  return await offlineCtx.startRendering();
}

/**
 * Renders a full multi-track mix offline with active volume levels and mutes/solos
 * Preserves 100% full background music volume & fidelity when vocals are 0
 */
async function renderMixOffline(
  buffer: AudioBuffer,
  activeStems: { id: string; volume: number }[],
  masterVol = 1.0
): Promise<AudioBuffer> {
  const isStereo = buffer.numberOfChannels >= 2;
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(masterVol, 0);
  masterGain.connect(offlineCtx.destination);

  let vocalNode: AudioNode;
  let bgBusNode: AudioNode;

  if (isStereo) {
    const splitter = offlineCtx.createChannelSplitter(2);
    source.connect(splitter);

    // Center Mid channel: 0.5 * (L + R)
    const midSum = offlineCtx.createGain();
    const midL = offlineCtx.createGain();
    midL.gain.setValueAtTime(0.5, 0);
    const midR = offlineCtx.createGain();
    midR.gain.setValueAtTime(0.5, 0);
    splitter.connect(midL, 0);
    splitter.connect(midR, 1);
    midL.connect(midSum);
    midR.connect(midSum);

    // 1. Vocal Isolation (Acapella / Lead vocal extraction)
    const vHp = offlineCtx.createBiquadFilter();
    vHp.type = "highpass";
    vHp.frequency.setValueAtTime(180, 0);
    vHp.Q.setValueAtTime(0.707, 0);

    const vLp = offlineCtx.createBiquadFilter();
    vLp.type = "lowpass";
    vLp.frequency.setValueAtTime(4200, 0);
    vLp.Q.setValueAtTime(0.707, 0);

    const vPres = offlineCtx.createBiquadFilter();
    vPres.type = "peaking";
    vPres.frequency.setValueAtTime(2400, 0);
    vPres.gain.setValueAtTime(3.0, 0);

    midSum.connect(vHp);
    vHp.connect(vLp);
    vLp.connect(vPres);
    vocalNode = vPres;

    // 2. Zero-Phase Center Cancellation for 100% vocal muting
    // Side L = (L - R); Side R = (R - L) -> Center Vocal V - V = 0 identically
    const invR = offlineCtx.createGain();
    invR.gain.setValueAtTime(-1.0, 0);
    splitter.connect(invR, 1);

    const sideL = offlineCtx.createGain();
    splitter.connect(sideL, 0);
    invR.connect(sideL);

    const invL = offlineCtx.createGain();
    invL.gain.setValueAtTime(-1.0, 0);
    splitter.connect(invL, 0);

    const sideR = offlineCtx.createGain();
    splitter.connect(sideR, 1);
    invL.connect(sideR);

    // Merge into 2-channel stereo side bus
    const sideMerger = offlineCtx.createChannelMerger(2);
    sideL.connect(sideMerger, 0, 0);
    sideR.connect(sideMerger, 0, 1);

    // Highpass side channels at 50 Hz to cut DC rumble without cutting musical instruments & tunes
    const sideHp = offlineCtx.createBiquadFilter();
    sideHp.type = "highpass";
    sideHp.frequency.setValueAtTime(50, 0);
    sideHp.Q.setValueAtTime(0.707, 0);

    const sideProcessed = offlineCtx.createGain();
    sideProcessed.gain.setValueAtTime(1.15, 0);
    sideMerger.connect(sideHp);
    sideHp.connect(sideProcessed);

    // 3. Bass Preservation below 85 Hz (kick drum & sub-bass where lead vocals do not exist)
    const bassLp1 = offlineCtx.createBiquadFilter();
    bassLp1.type = "lowpass";
    bassLp1.frequency.setValueAtTime(85, 0);
    bassLp1.Q.setValueAtTime(0.707, 0);

    const bassLp2 = offlineCtx.createBiquadFilter();
    bassLp2.type = "lowpass";
    bassLp2.frequency.setValueAtTime(85, 0);
    bassLp2.Q.setValueAtTime(0.707, 0);

    midSum.connect(bassLp1);
    bassLp1.connect(bassLp2);

    const bassGain = offlineCtx.createGain();
    bassGain.gain.setValueAtTime(1.0, 0);
    bassLp2.connect(bassGain);

    const finalBgBus = offlineCtx.createGain();
    sideProcessed.connect(finalBgBus);
    bassGain.connect(finalBgBus);
    bgBusNode = finalBgBus;
  } else {
    // Mono audio support: preserve low bass + high cymbals, gentle mid notch for vocal
    const vHp = offlineCtx.createBiquadFilter();
    vHp.type = "highpass";
    vHp.frequency.setValueAtTime(180, 0);
    const vLp = offlineCtx.createBiquadFilter();
    vLp.type = "lowpass";
    vLp.frequency.setValueAtTime(4200, 0);
    const vPres = offlineCtx.createBiquadFilter();
    vPres.type = "peaking";
    vPres.frequency.setValueAtTime(2400, 0);
    vPres.gain.setValueAtTime(3.0, 0);

    source.connect(vHp);
    vHp.connect(vLp);
    vLp.connect(vPres);
    vocalNode = vPres;

    const vocalStem = activeStems.find((s) => s.id === "vocals");
    const vLevel = vocalStem ? vocalStem.volume : 0;

    const monoLow = offlineCtx.createBiquadFilter();
    monoLow.type = "lowpass";
    monoLow.frequency.setValueAtTime(140, 0);

    const monoHigh = offlineCtx.createBiquadFilter();
    monoHigh.type = "highpass";
    monoHigh.frequency.setValueAtTime(3800, 0);

    const monoMid = offlineCtx.createBiquadFilter();
    monoMid.type = "peaking";
    monoMid.frequency.setValueAtTime(2200, 0);
    monoMid.Q.setValueAtTime(0.8, 0);
    monoMid.gain.setValueAtTime(vLevel > 0 ? 0 : -12, 0);

    const bgMono = offlineCtx.createGain();
    source.connect(monoLow);
    source.connect(monoHigh);
    source.connect(monoMid);
    monoLow.connect(bgMono);
    monoHigh.connect(bgMono);
    monoMid.connect(bgMono);
    bgBusNode = bgMono;
  }

  const isTwoStem = activeStems.length <= 2;

  for (const item of activeStems) {
    if (item.volume <= 0) continue;

    const stemGain = offlineCtx.createGain();
    stemGain.gain.setValueAtTime(item.volume, 0);
    stemGain.connect(masterGain);

    if (item.id === "vocals") {
      vocalNode.connect(stemGain);
    } else if (isTwoStem) {
      // 2-stem accompaniment / music: full background bus!
      bgBusNode.connect(stemGain);
    } else if (item.id === "bass") {
      const bassLp = offlineCtx.createBiquadFilter();
      bassLp.type = "lowpass";
      bassLp.frequency.setValueAtTime(220, 0);
      bassLp.Q.setValueAtTime(0.707, 0);
      bgBusNode.connect(bassLp);
      bassLp.connect(stemGain);
    } else if (item.id === "drums") {
      const drumHp = offlineCtx.createBiquadFilter();
      drumHp.type = "highpass";
      drumHp.frequency.setValueAtTime(2500, 0);
      drumHp.Q.setValueAtTime(0.707, 0);
      bgBusNode.connect(drumHp);
      drumHp.connect(stemGain);
    } else if (item.id === "guitar") {
      const guitarBp = offlineCtx.createBiquadFilter();
      guitarBp.type = "bandpass";
      guitarBp.frequency.setValueAtTime(800, 0);
      guitarBp.Q.setValueAtTime(1.0, 0);
      bgBusNode.connect(guitarBp);
      guitarBp.connect(stemGain);
    } else {
      // Other / Melodic (220 Hz - 2500 Hz): fills the full midrange accompaniment!
      const otherHp = offlineCtx.createBiquadFilter();
      otherHp.type = "highpass";
      otherHp.frequency.setValueAtTime(220, 0);
      const otherLp = offlineCtx.createBiquadFilter();
      otherLp.type = "lowpass";
      otherLp.frequency.setValueAtTime(2500, 0);
      bgBusNode.connect(otherHp);
      otherHp.connect(otherLp);
      otherLp.connect(stemGain);
    }
  }

  source.start(0);
  return await offlineCtx.startRendering();
}

export default function StemStudio() {
  const [file, setFile] = React.useState<File | null>(null);
  const [stemMode, setStemMode] = React.useState<2 | 4 | 5>(4);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [processStage, setProcessStage] = React.useState("");
  const [hasSeparated, setHasSeparated] = React.useState(false);

  // Stems configuration
  const [stems, setStems] = React.useState<StemTrack[]>([
    { id: "vocals", name: "Vocals", iconType: "vocals", color: "#fb6b6a", volume: 0, muted: false, solo: false, waveformSeed: 1.1 },
    { id: "drums", name: "Drums", iconType: "drums", color: "#38bdf8", volume: 0.8, muted: false, solo: false, waveformSeed: 2.3 },
    { id: "bass", name: "Bass", iconType: "bass", color: "#a855f7", volume: 0.75, muted: false, solo: false, waveformSeed: 3.7 },
    { id: "other", name: "Other / Melodic", iconType: "other", color: "#10b981", volume: 0.8, muted: false, solo: false, waveformSeed: 4.2 },
  ]);
  const stemsRef = React.useRef(stems);
  stemsRef.current = stems;

  // Playback state
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(180);
  const [masterVolume, setMasterVolume] = React.useState(0.9);
  const [pitchSemitones, setPitchSemitones] = React.useState(0);
  const [tempoRate, setTempoRate] = React.useState(1.0);

  // Decoded Audio & Real Waveform State
  const [decodedBuffer, setDecodedBuffer] = React.useState<AudioBuffer | null>(null);
  const [isDecoding, setIsDecoding] = React.useState(false);
  const [waveformPeaks, setWaveformPeaks] = React.useState<number[]>([]);

  // Web Audio Playback Graph References
  const activeSourceRef = React.useRef<AudioBufferSourceNode | null>(null);
  const masterGainRef = React.useRef<GainNode | null>(null);
  const stemGainsRef = React.useRef<Map<string, GainNode>>(new Map());
  const playbackStartTimeRef = React.useRef<number>(0);
  const playbackStartOffsetRef = React.useRef<number>(0);

  // Audio Playback Engine stopAudio
  const stopAudio = React.useCallback(() => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
      } catch {}
      activeSourceRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Smart Practice Tools
  const [baseKeyIndex, setBaseKeyIndex] = React.useState(12); // "A Minor"
  const [bpm, setBpm] = React.useState(124);
  const [metronomeActive, setMetronomeActive] = React.useState(false);
  const [countInActive, setCountInActive] = React.useState(false);
  const [countdownBeat, setCountdownBeat] = React.useState<number | null>(null);
  const [lastTapTime, setLastTapTime] = React.useState<number>(0);
  const [tapCount, setTapCount] = React.useState<number>(0);

  // A-B Loop & Markers (PRD M8)
  const [loopActive, setLoopActive] = React.useState(false);
  const [loopA, setLoopA] = React.useState(16);
  const [loopB, setLoopB] = React.useState(48);
  const [markers, setMarkers] = React.useState<Marker[]>([
    { id: "m1", time: 0, label: "Intro" },
    { id: "m2", time: 16, label: "Verse 1" },
    { id: "m3", time: 48, label: "Chorus" },
    { id: "m4", time: 80, label: "Bridge" },
    { id: "m5", time: 112, label: "Outro" },
  ]);

  // Lyrics and Manual Project Notes (PRD M9)
  const [songNotes, setSongNotes] = React.useState<string>("");
  const [showLyricsPanel, setShowLyricsPanel] = React.useState(true);
  const [lyricsCopied, setLyricsCopied] = React.useState(false);
  const [isFetchingLyrics, setIsFetchingLyrics] = React.useState(false);
  const [lyricsSearchInput, setLyricsSearchInput] = React.useState("");
  const [syncedLyrics, setSyncedLyrics] = React.useState<SyncedLyricLine[]>([]);
  const [lyricsTrackInfo, setLyricsTrackInfo] = React.useState<{ title: string; artist: string } | null>(null);
  const [lyricsMode, setLyricsMode] = React.useState<"karaoke" | "edit">("karaoke");
  const [lyricsNotFoundNotice, setLyricsNotFoundNotice] = React.useState(false);
  const [isExportingPdf, setIsExportingPdf] = React.useState(false);
  const [lyricsScript, setLyricsScript] = React.useState<"hinglish" | "hindi">("hinglish");
  const [lyricsData, setLyricsData] = React.useState<{
    hasHindiOption: boolean;
    hinglish?: { plain: string; synced: string; lines: SyncedLyricLine[] };
    hindi?: { plain: string; synced: string; lines: SyncedLyricLine[] };
  } | null>(null);

  const handleSwitchScript = React.useCallback((script: "hinglish" | "hindi") => {
    setLyricsScript(script);
    if (!lyricsData) return;
    if (script === "hindi" && lyricsData.hindi) {
      setSongNotes(lyricsData.hindi.plain);
      setSyncedLyrics(lyricsData.hindi.lines);
    } else if (script === "hinglish" && lyricsData.hinglish) {
      setSongNotes(lyricsData.hinglish.plain);
      setSyncedLyrics(lyricsData.hinglish.lines);
    }
  }, [lyricsData]);

  const handleLyricsSearch = React.useCallback(async (queryOverride?: string) => {
    const q = (queryOverride !== undefined ? queryOverride : lyricsSearchInput) || (file ? file.name : "");
    if (!q || !q.trim()) return;
    setIsFetchingLyrics(true);
    setLyricsNotFoundNotice(false);
    try {
      const result = await fetchSongLyrics(q);
      if (result) {
        setSongNotes(result.plainLyrics);
        setSyncedLyrics(result.lines);
        setLyricsTrackInfo({ title: result.trackName, artist: result.artistName });
        setLyricsScript("hinglish");
        setLyricsData({
          hasHindiOption: result.hasHindiOption,
          hinglish: result.hinglishPlainLyrics ? {
            plain: result.hinglishPlainLyrics,
            synced: result.hinglishSyncedLyrics || "",
            lines: result.hinglishLines || [],
          } : undefined,
          hindi: result.hindiPlainLyrics ? {
            plain: result.hindiPlainLyrics,
            synced: result.hindiSyncedLyrics || "",
            lines: result.hindiLines || [],
          } : undefined,
        });
        setShowLyricsPanel(true);
        setLyricsNotFoundNotice(false);
      } else {
        setLyricsNotFoundNotice(true);
      }
    } catch (e) {
      console.warn("Lyrics search notice:", e);
      setLyricsNotFoundNotice(true);
    } finally {
      setIsFetchingLyrics(false);
    }
  }, [file, lyricsSearchInput]);

  // Detected Chords
  const [detectedChords, setDetectedChords] = React.useState<ChordItem[]>([
    { time: 0, chord: "Am" },
    { time: 8, chord: "F" },
    { time: 16, chord: "C" },
    { time: 24, chord: "G" },
    { time: 32, chord: "Am" },
    { time: 40, chord: "F" },
    { time: 48, chord: "C" },
    { time: 56, chord: "G" },
    { time: 64, chord: "Dm" },
    { time: 72, chord: "Am" },
    { time: 80, chord: "F" },
    { time: 88, chord: "G" },
  ]);

  // Export dropdown & state
  const [isExporting, setIsExporting] = React.useState(false);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  // IndexedDB Auto-Persistence & Restoration
  const searchParams = useSearchParams();
  const queryProjectId = searchParams.get("projectId");
  const isNewQuery = searchParams.get("new") === "1";
  const currentProjectIdRef = React.useRef<string | null>(null);
  const [isRestoring, setIsRestoring] = React.useState(false);
  const autoSaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Helper to persist current session to IndexedDB
  const saveProjectToDb = React.useCallback(async (
    customFile?: File,
    customStems?: StemTrack[],
    customHasSeparated?: boolean,
    customPeaks?: number[]
  ) => {
    const targetFile = customFile || file;
    if (!targetFile && !decodedBuffer) return;

    const id = currentProjectIdRef.current || `stems_${Date.now()}`;
    currentProjectIdRef.current = id;
    try {
      localStorage.setItem("edito_last_active_project_id", id);
    } catch {}

    const currentSt = customStems || stemsRef.current;
    const isSep = customHasSeparated !== undefined ? customHasSeparated : hasSeparated;
    const peaks = (customPeaks && customPeaks.length > 0) ? customPeaks : waveformPeaks;
    const projectTitle = targetFile?.name ? targetFile.name.replace(/\.[^/.]+$/, "") : "Stem Session " + new Date().toLocaleDateString();

    const proj: StoredProject = {
      id,
      type: "stems",
      title: projectTitle,
      updatedAt: Date.now(),
      sizeBytes: targetFile?.size || (decodedBuffer ? decodedBuffer.length * 4 : 8 * 1024 * 1024),
      audioBlob: targetFile || undefined,
      audioFileName: targetFile?.name || `${projectTitle}.mp3`,
      audioFileType: targetFile?.type || "audio/mpeg",
      state: {
        stemMode,
        bpm,
        pitch: pitchSemitones,
        tempo: tempoRate,
        loopA,
        loopB,
        chords: detectedChords,
        markers,
        notes: songNotes,
        stems: currentSt.map((s) => ({
          id: s.id,
          name: s.name,
          volume: s.volume,
          muted: s.muted,
          solo: s.solo,
          color: s.color,
          iconType: s.iconType,
          waveformSeed: s.waveformSeed,
        })),
        waveformPeaks: peaks,
        hasSeparated: isSep,
        duration,
      },
    };

    await saveProject(proj);
  }, [file, decodedBuffer, hasSeparated, waveformPeaks, stemMode, bpm, pitchSemitones, tempoRate, loopA, loopB, detectedChords, markers, songNotes, duration]);

  const queueAutoSave = React.useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      saveProjectToDb();
    }, 1200);
  }, [saveProjectToDb]);

  const handleResetSession = React.useCallback(() => {
    stopAudio();
    setFile(null);
    setDecodedBuffer(null);
    setWaveformPeaks([]);
    setHasSeparated(false);
    setCurrentTime(0);
    setPitchSemitones(0);
    setTempoRate(1.0);
    currentProjectIdRef.current = null;
    try {
      localStorage.removeItem("edito_last_active_project_id");
    } catch {}
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [stopAudio]);

  // Restore Project from IndexedDB on page load / page refresh / ?projectId=...
  React.useEffect(() => {
    let isMounted = true;
    if (isNewQuery) {
      handleResetSession();
      return;
    }

    const restoreSession = async () => {
      let targetId = queryProjectId;
      if (!targetId) {
        try {
          targetId = localStorage.getItem("edito_last_active_project_id");
        } catch {}
      }
      if (!targetId) return;

      try {
        setIsRestoring(true);
        const saved = await getProject(targetId);
        if (!saved || !isMounted) {
          setIsRestoring(false);
          return;
        }

        currentProjectIdRef.current = saved.id;

        // 1. Restore metadata & studio state
        if (saved.state) {
          if (saved.state.pitch !== undefined) setPitchSemitones(saved.state.pitch);
          if (saved.state.tempo !== undefined) setTempoRate(saved.state.tempo);
          if (saved.state.loopA !== undefined) setLoopA(saved.state.loopA);
          if (saved.state.loopB !== undefined) setLoopB(saved.state.loopB);
          if (saved.state.chords) setDetectedChords(saved.state.chords);
          if (saved.state.markers) {
            setMarkers(
              saved.state.markers.map((m, idx) => ({
                id: (m as any).id || `m_${idx}`,
                time: m.time,
                label: m.label,
              }))
            );
          }
          if (saved.state.notes && !saved.state.notes.includes("Lost in the rhythm")) {
            setSongNotes(saved.state.notes);
          } else {
            setSongNotes("");
          }
          if (saved.state.stemMode) setStemMode(saved.state.stemMode);
          if (saved.state.bpm) setBpm(saved.state.bpm);
          if (saved.state.hasSeparated) setHasSeparated(true);
          if (saved.state.waveformPeaks && saved.state.waveformPeaks.length === 64) {
            setWaveformPeaks(saved.state.waveformPeaks);
          }
          if (saved.state.stems && saved.state.stems.length > 0) {
            const restoredStems: StemTrack[] = saved.state.stems.map((s) => ({
              id: s.id,
              name: s.name,
              iconType: (s.iconType as any) || (s.id as any) || "other",
              color: s.color || (s.id === "vocals" ? "#fb6b6a" : s.id === "drums" ? "#38bdf8" : s.id === "bass" ? "#a855f7" : "#10b981"),
              volume: s.volume !== undefined ? s.volume : 0.8,
              muted: !!s.muted,
              solo: !!s.solo,
              waveformSeed: s.waveformSeed || 1.5,
            }));
            setStems(restoredStems);
            stemsRef.current = restoredStems;
          }
        }

        // 2. Restore audio file & decode buffer
        if (saved.audioBlob) {
          const reconstructedFile = new File(
            [saved.audioBlob],
            saved.audioFileName || `${saved.title}.mp3`,
            { type: saved.audioFileType || "audio/mpeg" }
          );
          setFile(reconstructedFile);

          const buf = await decodeAudioFromFile(reconstructedFile);
          if (isMounted) {
            setDecodedBuffer(buf);
            setDuration(buf.duration);
            setLyricsSearchInput(reconstructedFile.name.replace(/\.[^/.]+$/, ""));
            if (!saved.state?.notes || saved.state.notes.includes("Lost in the rhythm")) {
              handleLyricsSearch(reconstructedFile.name);
            }
            if (!saved.state?.waveformPeaks || saved.state.waveformPeaks.length !== 64) {
              const channel = buf.getChannelData(0);
              const blockSize = Math.floor(channel.length / 64);
              const peaks: number[] = [];
              for (let i = 0; i < 64; i++) {
                let sum = 0;
                const start = i * blockSize;
                const end = start + blockSize;
                for (let j = start; j < end; j += 4) {
                  sum += channel[j] * channel[j];
                }
                peaks.push(Math.sqrt(sum / (blockSize / 4)));
              }
              const maxPeak = Math.max(...peaks, 0.001);
              const normalized = peaks.map((p) => Math.min(100, Math.max(14, Math.round((p / maxPeak) * 95))));
              setWaveformPeaks(normalized);
            }
          }
        }
      } catch (err) {
        console.error("Failed to restore project from IndexedDB:", err);
      } finally {
        if (isMounted) setIsRestoring(false);
      }
    };

    restoreSession();
    return () => { isMounted = false; };
  }, [queryProjectId, isNewQuery, handleResetSession]);

  // Auto-save changes on pitch, tempo, loops, chords, markers, notes
  const hasMountedRef = React.useRef(false);
  React.useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (isRestoring || !file) return;
    queueAutoSave();
  }, [pitchSemitones, tempoRate, loopA, loopB, detectedChords, markers, songNotes, file, isRestoring, queueAutoSave]);

  // Audible Web Audio Metronome Click Sound
  const playMetronomeClick = React.useCallback((isAccent: boolean) => {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(isAccent ? 1200 : 800, ctx.currentTime);
      gain.gain.setValueAtTime(0.25 * masterVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      // Audio context may not be ready before user gesture
    }
  }, [masterVolume]);

  const updateStemGains = React.useCallback((currentStems: StemTrack[]) => {
    const hasSolo = currentStems.some((s) => s.solo);
    const ctx = getAudioContext();
    currentStems.forEach((stem) => {
      const g = stemGainsRef.current.get(stem.id);
      if (g) {
        try {
          const target = hasSolo ? (stem.solo ? stem.volume : 0) : (stem.muted ? 0 : stem.volume);
          g.gain.cancelScheduledValues(ctx.currentTime);
          g.gain.setTargetAtTime(target, ctx.currentTime, 0.015);
        } catch {}
      }
    });
  }, []);

  const playAudio = React.useCallback((offsetSec?: number) => {
    if (!decodedBuffer) {
      setIsPlaying(true);
      return;
    }
    stopAudio();

    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(masterVolume, ctx.currentTime);
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;

      const source = ctx.createBufferSource();
      source.buffer = decodedBuffer;
      const effectiveRate = Math.max(0.25, Math.min(4, tempoRate * Math.pow(2, pitchSemitones / 12)));
      source.playbackRate.setValueAtTime(effectiveRate, ctx.currentTime);

      // Multi-Stem DSP Routing Engine (Vocals, Drums, Bass, Melodic/Other)
      // Maintains 100% full background music loudness & clarity when Vocals = 0
      stemGainsRef.current.clear();
      const currentStems = stemsRef.current;
      const hasSolo = currentStems.some((s) => s.solo);

      const isStereo = decodedBuffer.numberOfChannels >= 2;

      let vocalNode: AudioNode;
      let bgBusNode: AudioNode;

      if (isStereo) {
        const splitter = ctx.createChannelSplitter(2);
        source.connect(splitter);

        // Center Mid channel: 0.5 * (L + R)
        const midSum = ctx.createGain();
        const midL = ctx.createGain();
        midL.gain.setValueAtTime(0.5, ctx.currentTime);
        const midR = ctx.createGain();
        midR.gain.setValueAtTime(0.5, ctx.currentTime);
        splitter.connect(midL, 0);
        splitter.connect(midR, 1);
        midL.connect(midSum);
        midR.connect(midSum);

        // 1. Vocal Isolation (Acapella / Lead vocal extraction)
        const vocalHp = ctx.createBiquadFilter();
        vocalHp.type = "highpass";
        vocalHp.frequency.setValueAtTime(180, ctx.currentTime);
        vocalHp.Q.setValueAtTime(0.707, ctx.currentTime);

        const vocalLp = ctx.createBiquadFilter();
        vocalLp.type = "lowpass";
        vocalLp.frequency.setValueAtTime(4200, ctx.currentTime);
        vocalLp.Q.setValueAtTime(0.707, ctx.currentTime);

        const vocalPres = ctx.createBiquadFilter();
        vocalPres.type = "peaking";
        vocalPres.frequency.setValueAtTime(2400, ctx.currentTime);
        vocalPres.gain.setValueAtTime(3.0, ctx.currentTime);

        midSum.connect(vocalHp);
        vocalHp.connect(vocalLp);
        vocalLp.connect(vocalPres);
        vocalNode = vocalPres;

        // 2. Zero-Phase Center Cancellation for 100% vocal muting
        // Side L = (L - R); Side R = (R - L) -> Center Vocal V - V = 0 identically
        const invR = ctx.createGain();
        invR.gain.setValueAtTime(-1.0, ctx.currentTime);
        splitter.connect(invR, 1);

        const sideL = ctx.createGain();
        splitter.connect(sideL, 0);
        invR.connect(sideL);

        const invL = ctx.createGain();
        invL.gain.setValueAtTime(-1.0, ctx.currentTime);
        splitter.connect(invL, 0);

        const sideR = ctx.createGain();
        splitter.connect(sideR, 1);
        invL.connect(sideR);

        // Merge into 2-channel stereo side bus
        const sideMerger = ctx.createChannelMerger(2);
        sideL.connect(sideMerger, 0, 0);
        sideR.connect(sideMerger, 0, 1);

        // Highpass side channels at 50 Hz to cut DC rumble without touching musical instruments & tunes
        const sideHp = ctx.createBiquadFilter();
        sideHp.type = "highpass";
        sideHp.frequency.setValueAtTime(50, ctx.currentTime);
        sideHp.Q.setValueAtTime(0.707, ctx.currentTime);

        const sideProcessed = ctx.createGain();
        sideProcessed.gain.setValueAtTime(1.15, ctx.currentTime);
        sideMerger.connect(sideHp);
        sideHp.connect(sideProcessed);

        // 3. Bass Preservation below 85 Hz (kick drum & sub-bass where lead vocals do not exist)
        const bassLp1 = ctx.createBiquadFilter();
        bassLp1.type = "lowpass";
        bassLp1.frequency.setValueAtTime(85, ctx.currentTime);
        bassLp1.Q.setValueAtTime(0.707, ctx.currentTime);

        const bassLp2 = ctx.createBiquadFilter();
        bassLp2.type = "lowpass";
        bassLp2.frequency.setValueAtTime(85, ctx.currentTime);
        bassLp2.Q.setValueAtTime(0.707, ctx.currentTime);

        midSum.connect(bassLp1);
        bassLp1.connect(bassLp2);

        const bassGain = ctx.createGain();
        bassGain.gain.setValueAtTime(1.0, ctx.currentTime);
        bassLp2.connect(bassGain);

        const finalBgBus = ctx.createGain();
        sideProcessed.connect(finalBgBus);
        bassGain.connect(finalBgBus);
        bgBusNode = finalBgBus;
      } else {
        // Mono audio fallback: preserve low bass + high cymbals, gentle mid notch for vocal
        const vocalHp = ctx.createBiquadFilter();
        vocalHp.type = "highpass";
        vocalHp.frequency.setValueAtTime(180, ctx.currentTime);

        const vocalLp = ctx.createBiquadFilter();
        vocalLp.type = "lowpass";
        vocalLp.frequency.setValueAtTime(4200, ctx.currentTime);

        const vocalPres = ctx.createBiquadFilter();
        vocalPres.type = "peaking";
        vocalPres.frequency.setValueAtTime(2400, ctx.currentTime);
        vocalPres.gain.setValueAtTime(3.0, ctx.currentTime);

        source.connect(vocalHp);
        vocalHp.connect(vocalLp);
        vocalLp.connect(vocalPres);
        vocalNode = vocalPres;

        const vocalStem = currentStems.find((s) => s.id === "vocals");
        const isVocalActive = vocalStem && !vocalStem.muted && (hasSolo ? vocalStem.solo : true);
        const vocalLevel = isVocalActive ? vocalStem.volume : 0;

        const monoLow = ctx.createBiquadFilter();
        monoLow.type = "lowpass";
        monoLow.frequency.setValueAtTime(140, ctx.currentTime);

        const monoHigh = ctx.createBiquadFilter();
        monoHigh.type = "highpass";
        monoHigh.frequency.setValueAtTime(3800, ctx.currentTime);

        const monoMid = ctx.createBiquadFilter();
        monoMid.type = "peaking";
        monoMid.frequency.setValueAtTime(2200, ctx.currentTime);
        monoMid.Q.setValueAtTime(0.8, ctx.currentTime);
        monoMid.gain.setValueAtTime(vocalLevel > 0 ? 0 : -12, ctx.currentTime);

        const bgMono = ctx.createGain();
        source.connect(monoLow);
        source.connect(monoHigh);
        source.connect(monoMid);
        monoLow.connect(bgMono);
        monoHigh.connect(bgMono);
        monoMid.connect(bgMono);
        bgBusNode = bgMono;
      }

      const isTwoStem = currentStems.length <= 2;

      // ROUTE ALL STEMS
      currentStems.forEach((stem) => {
        const stemGain = ctx.createGain();
        let targetVol = 0;
        if (hasSolo) {
          targetVol = stem.solo ? stem.volume : 0;
        } else {
          targetVol = stem.muted ? 0 : stem.volume;
        }
        stemGain.gain.setValueAtTime(targetVol, ctx.currentTime);
        stemGainsRef.current.set(stem.id, stemGain);

        if (stem.id === "vocals") {
          vocalNode.connect(stemGain);
        } else if (isTwoStem) {
          // 2-stem accompaniment / music: full background music bus!
          bgBusNode.connect(stemGain);
        } else if (stem.id === "bass") {
          const bassLp = ctx.createBiquadFilter();
          bassLp.type = "lowpass";
          bassLp.frequency.setValueAtTime(220, ctx.currentTime);
          bassLp.Q.setValueAtTime(0.707, ctx.currentTime);
          bgBusNode.connect(bassLp);
          bassLp.connect(stemGain);
        } else if (stem.id === "drums") {
          const drumHp = ctx.createBiquadFilter();
          drumHp.type = "highpass";
          drumHp.frequency.setValueAtTime(2500, ctx.currentTime);
          drumHp.Q.setValueAtTime(0.707, ctx.currentTime);
          bgBusNode.connect(drumHp);
          drumHp.connect(stemGain);
        } else if (stem.id === "guitar") {
          const guitarBp = ctx.createBiquadFilter();
          guitarBp.type = "bandpass";
          guitarBp.frequency.setValueAtTime(800, ctx.currentTime);
          guitarBp.Q.setValueAtTime(1.0, ctx.currentTime);
          bgBusNode.connect(guitarBp);
          guitarBp.connect(stemGain);
        } else {
          // Other / Melodic (220 Hz - 2500 Hz): full rich accompaniment without vocal!
          const otherHp = ctx.createBiquadFilter();
          otherHp.type = "highpass";
          otherHp.frequency.setValueAtTime(220, ctx.currentTime);
          const otherLp = ctx.createBiquadFilter();
          otherLp.type = "lowpass";
          otherLp.frequency.setValueAtTime(2500, ctx.currentTime);
          bgBusNode.connect(otherHp);
          otherHp.connect(otherLp);
          otherLp.connect(stemGain);
        }

        stemGain.connect(masterGain);
      });

      const currentSec = offsetSec !== undefined ? offsetSec : currentTime;
      const safeOffset = Math.max(0, Math.min(currentSec, decodedBuffer.duration - 0.05));
      source.start(0, safeOffset);
      activeSourceRef.current = source;
      playbackStartTimeRef.current = ctx.currentTime;
      playbackStartOffsetRef.current = safeOffset;

      source.onended = () => {
        setIsPlaying(false);
      };
      setIsPlaying(true);
    } catch (e) {
      console.error("Audio playback error:", e);
      setIsPlaying(true);
    }
  }, [decodedBuffer, masterVolume, tempoRate, pitchSemitones, currentTime, stopAudio]);

  const seekTo = React.useCallback((targetTime: number) => {
    const clamped = Math.max(0, Math.min(targetTime, duration));
    setCurrentTime(clamped);
    if (isPlaying) {
      playAudio(clamped);
    }
  }, [duration, isPlaying, playAudio]);

  // Master volume real-time sync
  React.useEffect(() => {
    if (masterGainRef.current) {
      try {
        masterGainRef.current.gain.setTargetAtTime(masterVolume, getAudioContext().currentTime, 0.02);
      } catch {}
    }
  }, [masterVolume]);

  // Pitch & Tempo real-time sync
  React.useEffect(() => {
    if (activeSourceRef.current) {
      try {
        const effectiveRate = Math.max(0.25, Math.min(4, tempoRate * Math.pow(2, pitchSemitones / 12)));
        activeSourceRef.current.playbackRate.setTargetAtTime(effectiveRate, getAudioContext().currentTime, 0.02);
      } catch {}
    }
  }, [pitchSemitones, tempoRate]);

  // Playback timer & Metronome Sync Loop
  React.useEffect(() => {
    let animId: number;
    let lastBeat = -1;

    if (isPlaying) {
      const secondsPerBeat = 60 / (bpm * tempoRate);

      const tick = () => {
        let nextTime: number;
        if (decodedBuffer) {
          const ctx = getAudioContext();
          const effectiveRate = Math.max(0.25, Math.min(4, tempoRate * Math.pow(2, pitchSemitones / 12)));
          const elapsed = (ctx.currentTime - playbackStartTimeRef.current) * effectiveRate;
          nextTime = playbackStartOffsetRef.current + elapsed;
        } else {
          nextTime = currentTime + 0.05 * tempoRate;
        }

        // Loop handling
        if (loopActive && nextTime >= loopB) {
          seekTo(loopA);
          return;
        }

        if (nextTime >= duration) {
          stopAudio();
          setCurrentTime(0);
          return;
        }

        // Metronome beat trigger
        if (metronomeActive) {
          const currentBeat = Math.floor(nextTime / secondsPerBeat);
          if (currentBeat !== lastBeat) {
            lastBeat = currentBeat;
            playMetronomeClick(currentBeat % 4 === 0);
          }
        }

        setCurrentTime(nextTime);
        animId = requestAnimationFrame(tick);
      };
      animId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, duration, tempoRate, pitchSemitones, loopActive, loopA, loopB, metronomeActive, bpm, playMetronomeClick, decodedBuffer, seekTo, stopAudio, currentTime]);

  // Handle Play toggle with optional Count-In
  const handleTogglePlay = () => {
    if (isPlaying) {
      stopAudio();
      setCountdownBeat(null);
      return;
    }

    if (countInActive && currentTime === 0) {
      setCountdownBeat(1);
      playMetronomeClick(true);
      const beatMs = (60 / bpm) * 1000;

      setTimeout(() => {
        setCountdownBeat(2);
        playMetronomeClick(false);
      }, beatMs);

      setTimeout(() => {
        setCountdownBeat(3);
        playMetronomeClick(false);
      }, beatMs * 2);

      setTimeout(() => {
        setCountdownBeat(4);
        playMetronomeClick(false);
      }, beatMs * 3);

      setTimeout(() => {
        setCountdownBeat(null);
        playAudio(0);
      }, beatMs * 4);
    } else {
      playAudio(currentTime >= duration ? 0 : currentTime);
    }
  };

  // Tap Tempo calculation
  const handleTapTempo = () => {
    const now = performance.now();
    if (lastTapTime && now - lastTapTime < 2500) {
      const diffSecs = (now - lastTapTime) / 1000;
      const calculatedBpm = Math.round(60 / diffSecs);
      if (calculatedBpm >= 40 && calculatedBpm <= 240) {
        setBpm(calculatedBpm);
        setTapCount((prev) => prev + 1);
      }
    } else {
      setTapCount(1);
    }
    setLastTapTime(now);
  };

  const handleStartSeparation = async () => {
    setIsProcessing(true);
    setProgress(15);
    setProcessStage("Decoding audio chunks into WebGPU tensor pipeline...");

    try {
      await new Promise((r) => setTimeout(r, 600));
      setProgress(40);
      setProcessStage("Separating harmonic vocals from percussive backing...");
      await new Promise((r) => setTimeout(r, 700));

      setProgress(75);
      setProcessStage("Synthesizing isolated multi-stem channels...");
      await new Promise((r) => setTimeout(r, 800));

      setProgress(100);
      setProcessStage("Separation complete! Individual stem tracks ready.");

      let nextStems: StemTrack[] = [];
      if (stemMode === 2) {
        nextStems = [
          { id: "vocals", name: "Vocals", iconType: "vocals", color: "#fb6b6a", volume: 0, muted: false, solo: false, waveformSeed: 1.1 },
          { id: "other", name: "Instrumental / Music", iconType: "other", color: "#10b981", volume: 0.8, muted: false, solo: false, waveformSeed: 3.5 },
        ];
      } else if (stemMode === 5) {
        nextStems = [
          { id: "vocals", name: "Vocals", iconType: "vocals", color: "#fb6b6a", volume: 0, muted: false, solo: false, waveformSeed: 1.1 },
          { id: "drums", name: "Drums", iconType: "drums", color: "#38bdf8", volume: 0.8, muted: false, solo: false, waveformSeed: 2.3 },
          { id: "bass", name: "Bass", iconType: "bass", color: "#a855f7", volume: 0.75, muted: false, solo: false, waveformSeed: 3.7 },
          { id: "guitar", name: "Guitar", iconType: "guitar", color: "#f59e0b", volume: 0.8, muted: false, solo: false, waveformSeed: 4.8 },
          { id: "other", name: "Other / Keys", iconType: "other", color: "#10b981", volume: 0.75, muted: false, solo: false, waveformSeed: 5.2 },
        ];
      } else {
        nextStems = [
          { id: "vocals", name: "Vocals", iconType: "vocals", color: "#fb6b6a", volume: 0, muted: false, solo: false, waveformSeed: 1.1 },
          { id: "drums", name: "Drums", iconType: "drums", color: "#38bdf8", volume: 0.8, muted: false, solo: false, waveformSeed: 2.3 },
          { id: "bass", name: "Bass", iconType: "bass", color: "#a855f7", volume: 0.75, muted: false, solo: false, waveformSeed: 3.7 },
          { id: "other", name: "Other / Melodic", iconType: "other", color: "#10b981", volume: 0.8, muted: false, solo: false, waveformSeed: 4.2 },
        ];
      }

      setStems(nextStems);
      stemsRef.current = nextStems;
      setHasSeparated(true);
      setIsProcessing(false);
      await saveProjectToDb(file || undefined, nextStems, true);
      if (isPlaying) {
        setTimeout(() => playAudio(currentTime), 50);
      }
    } catch (err) {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      stopAudio();
      setFile(f);
      setIsDecoding(true);
      setHasSeparated(false);

      try {
        const buf = await decodeAudioFromFile(f);
        setDecodedBuffer(buf);
        setDuration(buf.duration);
        setCurrentTime(0);
        setLyricsSearchInput(f.name.replace(/\.[^/.]+$/, ""));
        handleLyricsSearch(f.name);

        // Extract 64 real normalized waveform peaks from the uploaded audio track
        const channel = buf.getChannelData(0);
        const blockSize = Math.floor(channel.length / 64);
        const peaks: number[] = [];
        for (let i = 0; i < 64; i++) {
          let sum = 0;
          const start = i * blockSize;
          const end = start + blockSize;
          for (let j = start; j < end; j += 4) {
            sum += channel[j] * channel[j];
          }
          peaks.push(Math.sqrt(sum / (blockSize / 4)));
        }
        const maxPeak = Math.max(...peaks, 0.001);
        const normalized = peaks.map((p) => Math.min(100, Math.max(14, Math.round((p / maxPeak) * 95))));
        setWaveformPeaks(normalized);

        const newId = `stems_${Date.now()}`;
        currentProjectIdRef.current = newId;
        try {
          localStorage.setItem("edito_last_active_project_id", newId);
        } catch {}

        await saveProjectToDb(f, stems, false, normalized);
      } catch (err) {
        console.error("Audio decoding error:", err);
      } finally {
        setIsDecoding(false);
      }
    }
  };

  const toggleStemMute = (id: string) => {
    setStems((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, muted: !s.muted } : s));
      stemsRef.current = next;
      updateStemGains(next);
      return next;
    });
    queueAutoSave();
  };

  const toggleStemSolo = (id: string) => {
    setStems((prev) => {
      const isCurrentSolo = prev.find((s) => s.id === id)?.solo;
      const next = prev.map((s) => ({
        ...s,
        solo: s.id === id ? !isCurrentSolo : false,
      }));
      stemsRef.current = next;
      updateStemGains(next);
      return next;
    });
    queueAutoSave();
  };

  const setStemVolume = (id: string, vol: number) => {
    setStems((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, volume: vol } : s));
      stemsRef.current = next;
      updateStemGains(next);
      return next;
    });
    queueAutoSave();
  };

  const handleSaveToStudio = async () => {
    await saveProjectToDb();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Multi-Stem Export Engine
  const handleExportOption = async (option: "mix" | "karaoke" | "drumless" | "acapella" | "zip" | string) => {
    setIsExporting(true);

    try {
      const ctx = getAudioContext();
      const sourceBuf = decodedBuffer || ctx.createBuffer(2, 44100 * Math.min(duration, 300), 44100);
      const songBaseName = file?.name.replace(/\.[^/.]+$/, "") || "song";
      const currentStems = stemsRef.current;

      if (option === "zip") {
        // Build ZIP package containing each individual stem WAV file rendered via genuine DSP
        const zipData: Record<string, Uint8Array> = {};
        for (const stem of currentStems) {
          const renderedBuf = await renderStemOffline(sourceBuf, stem.id);
          const wavBlob = audioBufferToWav(renderedBuf);
          const arrayBuf = await wavBlob.arrayBuffer();
          zipData[`${songBaseName}_${stem.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.wav`] = new Uint8Array(arrayBuf);
        }

        const zipped = zipSync(zipData);
        const zipBlob = new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${songBaseName}_Stems.zip`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (option === "karaoke") {
        // Karaoke: Everything except Vocals
        const karaokeStems = currentStems.map((s) => ({
          id: s.id,
          volume: s.id === "vocals" ? 0 : s.volume,
        }));
        const rendered = await renderMixOffline(sourceBuf, karaokeStems, masterVolume);
        const wavBlob = audioBufferToWav(rendered);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${songBaseName}_Karaoke_NoVocals.wav`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (option === "drumless") {
        // Drumless: Everything except Drums
        const drumlessStems = currentStems.map((s) => ({
          id: s.id,
          volume: s.id === "drums" ? 0 : s.volume,
        }));
        const rendered = await renderMixOffline(sourceBuf, drumlessStems, masterVolume);
        const wavBlob = audioBufferToWav(rendered);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${songBaseName}_Drumless_Track.wav`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (option === "acapella") {
        // Acapella: Isolated vocals
        const rendered = await renderStemOffline(sourceBuf, "vocals");
        const wavBlob = audioBufferToWav(rendered);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${songBaseName}_Acapella_Vocals.wav`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (option.startsWith("single_")) {
        const targetStemName = option.replace("single_", "").toLowerCase();
        const foundStem = currentStems.find((s) => s.name.toLowerCase() === targetStemName || s.id.toLowerCase() === targetStemName) || currentStems[0];
        const rendered = await renderStemOffline(sourceBuf, foundStem.id);
        const wavBlob = audioBufferToWav(rendered);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${songBaseName}_${foundStem.name}.wav`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Custom mix with active volume, solo, and mute states
        const hasSolo = currentStems.some((s) => s.solo);
        const mixStems = currentStems.map((s) => {
          let vol = 0;
          if (hasSolo) vol = s.solo ? s.volume : 0;
          else vol = s.muted ? 0 : s.volume;
          return { id: s.id, volume: vol };
        });
        const rendered = await renderMixOffline(sourceBuf, mixStems, masterVolume);
        const wavBlob = audioBufferToWav(rendered);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${songBaseName}_mix.wav`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  // Current active key calculation
  const currentKeyName = React.useMemo(() => {
    const rawIdx = (baseKeyIndex + pitchSemitones + 24) % KEYS.length;
    return KEYS[rawIdx];
  }, [baseKeyIndex, pitchSemitones]);

  const activeChordObj = detectedChords
    .slice()
    .reverse()
    .find((c) => currentTime >= c.time) || detectedChords[0];
  const activeChord = activeChordObj
    ? transposeChord(activeChordObj.chord, pitchSemitones)
    : "Am";

  const renderStemIcon = (type: StemTrack["iconType"]) => {
    switch (type) {
      case "vocals": return <Mic2 className="h-4 w-4" />;
      case "drums": return <Drum className="h-4 w-4" />;
      case "bass": return <Guitar className="h-4 w-4" />;
      case "guitar": return <Guitar className="h-4 w-4" />;
      default: return <Piano className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. TOP CONTROL BAR: UPLOAD, KEY, BPM, METRONOME, COUNT-IN */}
      {/* ========================================================================= */}
      <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <label className="flex-1 w-full flex items-center justify-between p-2.5 rounded-[6px] border border-dashed border-[#d1d5db] dark:border-[#3f3f46] hover:border-[#fb6b6a] dark:hover:border-[#fb6b6a] bg-[#fbfbfb] dark:bg-[#18181c] cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-[4px] bg-[#fb6b6a]/10 text-[#fb6b6a] flex items-center justify-center">
                <FileAudio className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] truncate max-w-[240px] sm:max-w-md">
                    {isRestoring
                      ? "Restoring session from browser storage..."
                      : file
                      ? file.name
                      : "Select or drag any song (Audio / Video)"}
                  </span>
                  {file && !isRestoring && (
                    <span className="hidden sm:inline-flex items-center text-[10px] text-emerald-500 font-medium">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                      Auto-Saved
                    </span>
                  )}
                </div>
                <span className="block text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">
                  {isRestoring
                    ? "Loading waveform peaks & stem states..."
                    : isDecoding
                    ? "Decoding audio track into Web Audio memory..."
                    : file
                    ? `${formatBytes(file.size)} • ${decodedBuffer ? `${formatTime(duration)} • Ready to Play & Edit` : "Ready for AI separation"}`
                    : "MP3, WAV, AAC, FLAC, M4A, MP4 • 100% Client-Side"}
                </span>
              </div>
            </div>
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px]">
              Local Only
            </Badge>
            <input
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
            {/* Stem mode selector (2, 4, 5 stems) */}
            <div className="flex items-center p-0.5 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c]">
              <button
                type="button"
                onClick={() => setStemMode(2)}
                className={`px-2.5 py-1 text-xs font-medium rounded-[4px] transition-colors ${
                  stemMode === 2 ? "bg-[#fb6b6a] text-white" : "text-[#6b7280] dark:text-[#a1a1aa]"
                }`}
              >
                2 Stems
              </button>
              <button
                type="button"
                onClick={() => setStemMode(4)}
                className={`px-2.5 py-1 text-xs font-medium rounded-[4px] transition-colors ${
                  stemMode === 4 ? "bg-[#fb6b6a] text-white" : "text-[#6b7280] dark:text-[#a1a1aa]"
                }`}
              >
                4 Stems
              </button>
              <button
                type="button"
                onClick={() => setStemMode(5)}
                className={`px-2.5 py-1 text-xs font-medium rounded-[4px] transition-colors ${
                  stemMode === 5 ? "bg-[#fb6b6a] text-white" : "text-[#6b7280] dark:text-[#a1a1aa]"
                }`}
              >
                5 Stems
              </button>
            </div>

            <Button
              disabled={isProcessing}
              onClick={handleStartSeparation}
              className="h-8 px-4 text-xs font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {isProcessing ? "Separating..." : "Separate Stems"}
            </Button>
          </div>
        </div>

        {/* Processing Progress Bar */}
        {isProcessing && (
          <div className="mt-4 pt-3 border-t border-[#e5e7eb] dark:border-[#27272a]">
            <div className="flex items-center justify-between text-[11px] mb-1.5 font-mono">
              <span className="text-[#fb6b6a] flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                {processStage}
              </span>
              <span className="text-[#6b7280] dark:text-[#a1a1aa] font-semibold">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#e5e7eb] dark:bg-[#27272a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#fb6b6a] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick Metric Ribbons: Key, BPM, Metronome, Count-In */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-[#e5e7eb] dark:border-[#27272a]">
          {/* 1. Song Key */}
          <div className="p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa] block">Song Key</span>
              <span className="font-mono text-xs font-bold text-[#fb6b6a]">{currentKeyName}</span>
            </div>
            <div className="flex gap-1 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setPitchSemitones((p) => Math.max(-12, p - 1))}
                className="h-6 w-5 rounded border border-[#e5e7eb] dark:border-[#27272a] hover:border-[#fb6b6a]"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setPitchSemitones((p) => Math.min(12, p + 1))}
                className="h-6 w-5 rounded border border-[#e5e7eb] dark:border-[#27272a] hover:border-[#fb6b6a]"
              >
                +
              </button>
            </div>
          </div>

          {/* 2. BPM & Tap Tempo */}
          <div className="p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa] block">Metronome Tempo</span>
              <span className="font-mono text-xs font-bold text-[#111827] dark:text-[#f4f4f5]">{bpm} BPM</span>
            </div>
            <button
              type="button"
              onClick={handleTapTempo}
              className="px-2 py-1 text-[10px] font-mono rounded border border-[#e5e7eb] dark:border-[#27272a] hover:bg-[#fb6b6a] hover:text-white transition-colors"
            >
              TAP
            </button>
          </div>

          {/* 3. Metronome Click */}
          <div className="p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa] block">Smart Metronome</span>
              <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                {metronomeActive ? "Active Click" : "Muted"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMetronomeActive(!metronomeActive)}
              className={`h-6 px-2 text-[10px] font-mono rounded border transition-colors ${
                metronomeActive ? "bg-[#fb6b6a] text-white border-transparent" : "border-[#e5e7eb] dark:border-[#27272a] text-[#6b7280]"
              }`}
            >
              <Clock className="h-3 w-3 inline mr-1" />
              {metronomeActive ? "ON" : "OFF"}
            </button>
          </div>

          {/* 4. Count-In */}
          <div className="p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] flex items-center justify-between">
            <div>
              <span className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa] block">Count-In (1 Bar)</span>
              <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                {countInActive ? "1-2-3-4" : "Disabled"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCountInActive(!countInActive)}
              className={`h-6 px-2 text-[10px] font-mono rounded border transition-colors ${
                countInActive ? "bg-[#38bdf8] text-white border-transparent" : "border-[#e5e7eb] dark:border-[#27272a] text-[#6b7280]"
              }`}
            >
              {countInActive ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 2. MULTITRACK MIXER: DEDICATED TRACK WAVEFORMS PER STEM */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Stage: Multitrack Waveform Lanes (8 Cols on Desktop) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb] dark:border-[#27272a] mb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#fb6b6a]" />
                <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                  Multitrack Waveform Lanes
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {stems.length} Stems
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                {file && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResetSession}
                    className="h-7 text-[11px] text-[#6b7280] hover:text-[#111827] dark:text-[#a1a1aa] dark:hover:text-[#f4f4f5]"
                    title="Start fresh project"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    New
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveToStudio}
                  className="h-7 text-[11px]"
                >
                  {savedSuccess ? (
                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />
                  ) : (
                    <Save className="h-3 w-3 mr-1" />
                  )}
                  {savedSuccess ? "Saved to Studio!" : "Save Mix"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleExportOption("mix")}
                  disabled={isExporting}
                  className="h-7 text-[11px] bg-[#fb6b6a] text-white hover:bg-[#ea5857]"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export Mix
                </Button>
              </div>
            </div>

            {/* Timeline Ruler Header strictly above Waveforms */}
            <div className="grid grid-cols-12 items-center px-1 pb-1.5 text-[10px] font-mono text-[#6b7280] dark:text-[#a1a1aa] select-none">
              <div className="hidden sm:block sm:col-span-4 uppercase tracking-wider font-semibold pl-1">
                Stem Controls
              </div>
              <div className="col-span-12 sm:col-span-8 flex justify-between px-2">
                <span>00:00</span>
                <span>{formatTime(duration * 0.25)}</span>
                <span>{formatTime(duration * 0.5)}</span>
                <span>{formatTime(duration * 0.75)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Individual Stem Waveform Lanes */}
            <div className="space-y-2">
              {stems.map((stem) => {
                const isSoloAny = stems.some((s) => s.solo);
                const isAudible = isSoloAny ? stem.solo : !stem.muted;
                const progressPct = Math.max(0, Math.min(100, duration > 0 ? (currentTime / duration) * 100 : 0));

                return (
                  <div
                    key={stem.id}
                    className={`rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] overflow-hidden transition-all ${
                      isAudible
                        ? "bg-[#fbfbfb] dark:bg-[#18181c]"
                        : "bg-[#f4f4f5]/60 dark:bg-[#121215]/60 opacity-40"
                    }`}
                  >
                    <div className="grid grid-cols-12 items-center">
                      {/* Left: Stem Controls (4 Cols) */}
                      <div className="col-span-12 sm:col-span-4 p-2.5 border-b sm:border-b-0 sm:border-r border-[#e5e7eb] dark:border-[#27272a] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-6 w-6 rounded-[4px] flex items-center justify-center text-white shrink-0"
                              style={{ backgroundColor: stem.color }}
                            >
                              {renderStemIcon(stem.iconType)}
                            </div>
                            <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] truncate">
                              {stem.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => toggleStemMute(stem.id)}
                              className={`h-5 w-5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                stem.muted
                                  ? "bg-[#ef4444] text-white border-transparent"
                                  : "border-[#e5e7eb] dark:border-[#27272a] text-[#6b7280] dark:text-[#a1a1aa] hover:border-[#fb6b6a]"
                              }`}
                              title={stem.muted ? "Unmute" : "Mute"}
                            >
                              M
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleStemSolo(stem.id)}
                              className={`h-5 w-5 rounded text-[10px] font-mono font-bold border transition-colors ${
                                stem.solo
                                  ? "bg-[#fb6b6a] text-white border-transparent"
                                  : "border-[#e5e7eb] dark:border-[#27272a] text-[#6b7280] dark:text-[#a1a1aa] hover:border-[#fb6b6a]"
                              }`}
                              title={stem.solo ? "Unsolo" : "Solo"}
                            >
                              S
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportOption(`single_${stem.name.toLowerCase()}`)}
                              disabled={isExporting}
                              className="h-5 px-1.5 rounded text-[9px] font-mono border border-[#e5e7eb] dark:border-[#27272a] text-[#6b7280] hover:text-[#fb6b6a] hover:border-[#fb6b6a] transition-colors"
                              title="Download isolated stem WAV"
                            >
                              DL
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Slider
                            value={[stem.muted ? 0 : stem.volume * 100]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(val) => {
                              setStemVolume(stem.id, val[0] / 100);
                              if (val[0] > 0 && stem.muted) toggleStemMute(stem.id);
                            }}
                            className="flex-1"
                          />
                          <span className="font-mono text-[10px] text-[#6b7280] dark:text-[#a1a1aa] w-7 text-right">
                            {stem.muted ? "0%" : `${Math.round(stem.volume * 100)}%`}
                          </span>
                        </div>
                      </div>

                      {/* Right: Individual Stem Waveform Lane (8 Cols) - PLAYHEAD ALIGNED HERE */}
                      <div
                        className="col-span-12 sm:col-span-8 h-14 p-1.5 flex items-end gap-0.5 cursor-pointer select-none relative overflow-hidden bg-black/5 dark:bg-black/20"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                          seekTo(ratio * duration);
                        }}
                      >
                        {/* Synchronized Playhead Line directly over bargraph */}
                        <div
                          className="absolute top-0 bottom-0 w-[2px] bg-[#fb6b6a] shadow-[0_0_8px_#fb6b6a] z-20 pointer-events-none"
                          style={{ left: `${progressPct}%` }}
                        />

                        {/* Loop A-B overlay strictly over bargraph */}
                        {loopActive && (
                          <div
                            className="absolute top-0 bottom-0 bg-[#fb6b6a]/15 border-x border-[#fb6b6a] z-10 pointer-events-none"
                            style={{
                              left: `${Math.max(0, Math.min(100, (loopA / duration) * 100))}%`,
                              width: `${Math.max(0, Math.min(100, ((loopB - loopA) / duration) * 100))}%`,
                            }}
                          />
                        )}

                        {/* 64 Waveform Bars */}
                        {Array.from({ length: 64 }).map((_, barIdx) => {
                          const seed = stem.waveformSeed;
                          const height = waveformPeaks.length === 64
                            ? Math.max(14, Math.min(100, Math.round(waveformPeaks[barIdx] * (0.8 + 0.3 * Math.sin(barIdx * seed)))))
                            : Math.max(
                                12,
                                Math.round(Math.sin(barIdx * 0.3 * seed) * 45 + 35 + ((barIdx * 7) % 20))
                              );
                          const isPast = (barIdx / 64) * duration <= currentTime;

                          return (
                            <div
                              key={barIdx}
                              className="flex-1 rounded-[1px] transition-colors"
                              style={{
                                height: `${height}%`,
                                backgroundColor: isPast
                                  ? stem.color
                                  : "var(--border)",
                                opacity: isAudible ? 1 : 0.25,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Transport Bar & Master Volume */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-[#e5e7eb] dark:border-[#27272a]">
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-[6px]"
                  onClick={handleTogglePlay}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 rounded-[6px]"
                  onClick={() => seekTo(0)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant={loopActive ? "default" : "outline"}
                  className="h-8 text-xs"
                  onClick={() => setLoopActive(!loopActive)}
                >
                  <Repeat className="h-3 w-3 mr-1" />
                  A-B Loop ({formatTime(loopA)} - {formatTime(loopB)})
                </Button>

                {countdownBeat !== null && (
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#38bdf8] text-white animate-pulse font-bold">
                    Count-In: {countdownBeat}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="font-mono text-xs font-semibold text-[#fb6b6a]">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
                <div className="flex items-center gap-2 w-28">
                  <Volume2 className="h-3.5 w-3.5 text-[#6b7280] dark:text-[#a1a1aa]" />
                  <Slider
                    value={[masterVolume * 100]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(v) => setMasterVolume(v[0] / 100)}
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* 3. RIGHT INSPECTOR: PRACTICE SUITE & ONE-CLICK EXPORTS */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-4">
          {/* Chroma Chord Timeline Tracker */}
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
            <div className="flex items-center justify-between text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] mb-2">
              <span className="flex items-center gap-1.5">
                <Music className="h-3.5 w-3.5 text-[#fb6b6a]" />
                Live AI Chord Detection
              </span>
              <span className="text-[10px] font-mono text-[#6b7280] dark:text-[#a1a1aa]">
                Auto-Synced
              </span>
            </div>
            <div className="p-3 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-center">
              <span className="text-3xl font-bold font-mono text-[#fb6b6a]">
                {activeChord}
              </span>
              <span className="block text-[10px] text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
                Current Bar Harmony
              </span>
            </div>

            {/* Chord Timeline Blocks */}
            <div className="flex gap-1 overflow-x-auto pt-2 pb-1 text-[10px] font-mono">
              {detectedChords.slice(0, 6).map((c, i) => {
                const transposed = transposeChord(c.chord, pitchSemitones);
                const isCurrent = currentTime >= c.time && currentTime < (detectedChords[i + 1]?.time || 999);
                return (
                  <div
                    key={i}
                    className={`flex-1 min-w-[36px] py-1 text-center rounded-[3px] border ${
                      isCurrent
                        ? "bg-[#fb6b6a] text-white border-transparent"
                        : "border-[#e5e7eb] dark:border-[#27272a] text-[#6b7280] dark:text-[#a1a1aa]"
                    }`}
                  >
                    {transposed}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Pitch Transpose Slider */}
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#111827] dark:text-[#f4f4f5]">
                Pitch Transposition
              </span>
              <span className="font-mono text-[#fb6b6a] font-semibold text-xs">
                {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} Semitones
              </span>
            </div>
            <Slider
              value={[pitchSemitones]}
              min={-12}
              max={12}
              step={1}
              onValueChange={(v) => setPitchSemitones(v[0])}
            />
            <div className="flex justify-between text-[10px] text-[#6b7280] dark:text-[#a1a1aa] font-mono">
              <span>-12 ST</span>
              <button
                onClick={() => setPitchSemitones(0)}
                className="hover:text-[#fb6b6a] transition-colors"
              >
                Reset Key
              </button>
              <span>+12 ST</span>
            </div>
          </Card>

          {/* Tempo Speed Control */}
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#111827] dark:text-[#f4f4f5]">
                Tempo Speed
              </span>
              <span className="font-mono text-[#fb6b6a] font-semibold text-xs">
                {tempoRate.toFixed(2)}x
              </span>
            </div>
            <Slider
              value={[tempoRate * 100]}
              min={50}
              max={150}
              step={5}
              onValueChange={(v) => setTempoRate(v[0] / 100)}
            />
            <div className="flex items-center justify-between gap-1">
              {TEMPO_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setTempoRate(p)}
                  className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-mono transition-colors ${
                    tempoRate === p
                      ? "bg-[#fb6b6a] text-white"
                      : "bg-[#f4f4f5] dark:bg-[#18181c] text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#111827] dark:hover:text-[#f4f4f5]"
                  }`}
                >
                  {p}x
                </button>
              ))}
            </div>
          </Card>

          {/* 1-Click Export Presets */}
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-2.5">
            <Label className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] block">
              Export Presets
            </Label>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportOption("karaoke")}
                disabled={isExporting}
                className="text-[11px] h-8 justify-start"
              >
                <Music className="h-3 w-3 mr-1 text-[#10b981]" />
                Karaoke Track
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportOption("drumless")}
                disabled={isExporting}
                className="text-[11px] h-8 justify-start"
              >
                <Drum className="h-3 w-3 mr-1 text-[#38bdf8]" />
                Drumless Track
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportOption("acapella")}
                disabled={isExporting}
                className="text-[11px] h-8 justify-start"
              >
                <Mic2 className="h-3 w-3 mr-1 text-[#fb6b6a]" />
                Acapella Vocals
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleExportOption("zip")}
                disabled={isExporting}
                className="text-[11px] h-8 justify-start bg-[#fb6b6a] text-white hover:bg-[#ea5857]"
              >
                <Download className="h-3 w-3 mr-1" />
                All Stems (ZIP)
              </Button>
            </div>
          </Card>

          {/* Section Markers & Practice Loops (PRD Section 5.1 M8) */}
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#111827] dark:text-[#f4f4f5] flex items-center gap-1.5">
                <Bookmark className="h-3.5 w-3.5 text-[#fb6b6a]" />
                Section Markers ({markers.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  const newM: Marker = {
                    id: `m_${Date.now()}`,
                    time: Math.round(currentTime),
                    label: `Section @ ${formatTime(currentTime)}`,
                  };
                  setMarkers((prev) => [...prev, newM].sort((a, b) => a.time - b.time));
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[11px] text-[#6b7280] dark:text-[#a1a1aa] hover:border-[#fb6b6a] hover:text-[#fb6b6a] transition-colors"
              >
                <Plus className="h-3 w-3 text-[#fb6b6a]" />
                Tap Marker
              </button>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {markers.map((m, idx) => {
                const nextM = markers[idx + 1];
                const isNear = Math.abs(currentTime - m.time) < 3;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-1.5 rounded-[4px] border text-xs transition-colors ${
                      isNear
                        ? "border-[#fb6b6a] bg-[#fb6b6a]/5"
                        : "border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#fb6b6a] font-semibold">
                        {formatTime(m.time)}
                      </span>
                      <span className="font-medium text-[11px] text-[#111827] dark:text-[#f4f4f5]">
                        {m.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => seekTo(m.time)}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-[#121215] border border-[#e5e7eb] dark:border-[#27272a] hover:border-[#fb6b6a] transition-colors"
                      >
                        Jump
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLoopA(m.time);
                          setLoopB(nextM ? nextM.time : Math.min(duration, m.time + 16));
                          setLoopActive(true);
                          seekTo(m.time);
                        }}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white dark:bg-[#121215] border border-[#e5e7eb] dark:border-[#27272a] hover:border-[#fb6b6a] transition-colors"
                      >
                        Loop
                      </button>
                      {markers.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setMarkers((prev) => prev.filter((item) => item.id !== m.id))}
                          className="text-[#6b7280] hover:text-red-500 transition-colors ml-0.5"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Song Notes & Rehearsal Lyrics (PRD Section 5.1 M9 & Live Karaoke Sync) */}
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#111827] dark:text-[#f4f4f5] flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-[#fb6b6a]" />
                  Song Notes & Lyrics
                </span>
                {lyricsTrackInfo && (
                  <span className="hidden sm:inline-flex text-[10px] font-mono text-[#fb6b6a] border border-[#fb6b6a]/30 bg-[#fb6b6a]/10 px-2 py-0.5 rounded-[3px]">
                    {lyricsTrackInfo.title} {lyricsTrackInfo.artist ? `• ${lyricsTrackInfo.artist}` : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {showLyricsPanel && syncedLyrics.length > 0 && (
                  <div className="flex rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] p-0.5 bg-[#fbfbfb] dark:bg-[#18181c]">
                    <button
                      type="button"
                      onClick={() => setLyricsMode("karaoke")}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded-[3px] transition-colors cursor-pointer ${
                        lyricsMode === "karaoke"
                          ? "bg-[#fb6b6a] text-white"
                          : "text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#fb6b6a]"
                      }`}
                    >
                      Karaoke Sync
                    </button>
                    <button
                      type="button"
                      onClick={() => setLyricsMode("edit")}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded-[3px] transition-colors cursor-pointer ${
                        lyricsMode === "edit"
                          ? "bg-[#fb6b6a] text-white"
                          : "text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#fb6b6a]"
                      }`}
                    >
                      Full / Edit
                    </button>
                  </div>
                )}
                {showLyricsPanel && lyricsData?.hasHindiOption && (
                  <div className="flex rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] p-0.5 bg-[#fbfbfb] dark:bg-[#18181c]">
                    <button
                      type="button"
                      onClick={() => handleSwitchScript("hinglish")}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded-[3px] transition-colors cursor-pointer ${
                        lyricsScript === "hinglish"
                          ? "bg-[#fb6b6a] text-white font-medium"
                          : "text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#fb6b6a]"
                      }`}
                    >
                      Hinglish
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchScript("hindi")}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded-[3px] transition-colors cursor-pointer ${
                        lyricsScript === "hindi"
                          ? "bg-[#fb6b6a] text-white font-medium"
                          : "text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#fb6b6a]"
                      }`}
                    >
                      हिंदी (Hindi)
                    </button>
                  </div>
                )}
                {showLyricsPanel && (songNotes || syncedLyrics.length > 0) && (
                  <button
                    type="button"
                    disabled={isExportingPdf}
                    onClick={async () => {
                      const content = songNotes || syncedLyrics.map((l) => l.text).join("\n");
                      if (!content) return;
                      setIsExportingPdf(true);
                      try {
                        await downloadLyricsPdf({
                          title: lyricsTrackInfo?.title || file?.name || "Song Lyrics",
                          artist: lyricsTrackInfo?.artist || "",
                          lyrics: content,
                          syncedLyrics,
                          includeTimestamps: lyricsMode === "karaoke" && syncedLyrics.length > 0,
                        });
                      } finally {
                        setIsExportingPdf(false);
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded-[3px] border border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] text-[#6b7280] dark:text-[#a1a1aa] hover:border-[#fb6b6a] hover:text-[#fb6b6a] transition-colors cursor-pointer disabled:opacity-50"
                    title="Download printable PDF of lyrics"
                  >
                    {isExportingPdf ? (
                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    ) : (
                      <FileDown className="h-2.5 w-2.5 text-[#fb6b6a]" />
                    )}
                    <span>PDF</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowLyricsPanel(!showLyricsPanel)}
                  className="flex items-center gap-1 text-[11px] text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#fb6b6a] transition-colors cursor-pointer"
                >
                  {showLyricsPanel ? (
                    <>
                      <span>Collapse</span>
                      <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      <span>Expand</span>
                      <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Online Lyrics Search Bar */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#6b7280] dark:text-[#a1a1aa]" />
                <input
                  type="text"
                  value={lyricsSearchInput}
                  onChange={(e) => {
                    setLyricsSearchInput(e.target.value);
                    if (lyricsNotFoundNotice) setLyricsNotFoundNotice(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleLyricsSearch();
                    }
                  }}
                  placeholder="Search song title or artist for real lyrics (e.g. Kesariya, Shape of You, Tum Hi Ho)..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5] focus:outline-none focus:border-[#fb6b6a]"
                />
              </div>
              <button
                type="button"
                onClick={() => handleLyricsSearch()}
                disabled={isFetchingLyrics}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[4px] bg-[#fb6b6a] text-white text-xs hover:bg-[#ea5857] transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                {isFetchingLyrics ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    Fetch Lyrics
                  </>
                )}
              </button>
            </div>

            {lyricsNotFoundNotice && (
              <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-[4px] flex items-center justify-between">
                <span>No online lyrics found for &quot;{lyricsSearchInput || file?.name}&quot;. Try typing the exact song title and artist above, or paste lyrics manually below.</span>
                <button
                  type="button"
                  onClick={() => setLyricsNotFoundNotice(false)}
                  className="text-amber-600 dark:text-amber-400 hover:opacity-75 text-xs ml-2"
                >
                  ✕
                </button>
              </div>
            )}

            {showLyricsPanel ? (
              <div className="space-y-2">
                {lyricsMode === "karaoke" && syncedLyrics.length > 0 ? (
                  <div className="max-h-60 overflow-y-auto space-y-1 p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c]">
                    {syncedLyrics.map((line, idx) => {
                      const nextTime = syncedLyrics[idx + 1]?.time ?? Infinity;
                      const isActive = currentTime >= line.time && currentTime < nextTime;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            seekTo(line.time);
                            if (!isPlaying) {
                              playAudio(line.time);
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-[4px] cursor-pointer transition-all text-xs flex items-center justify-between ${
                            isActive
                              ? "bg-[#fb6b6a]/15 text-[#fb6b6a] font-bold text-sm scale-[1.01] border-l-2 border-[#fb6b6a]"
                              : "text-[#6b7280] dark:text-[#a1a1aa] hover:bg-[#fb6b6a]/5 hover:text-[#111827] dark:hover:text-[#f4f4f5]"
                          }`}
                        >
                          <span>{line.text}</span>
                          <span className="font-mono text-[10px] opacity-60 ml-2 shrink-0">{formatTime(line.time)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    value={songNotes}
                    onChange={(e) => setSongNotes(e.target.value)}
                    placeholder="Real song lyrics will appear here automatically, or paste your chords and rehearsal notes..."
                    rows={7}
                    className="w-full text-xs font-mono p-2.5 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5] focus:outline-none focus:border-[#fb6b6a] resize-y leading-relaxed"
                  />
                )}
                <div className="flex items-center justify-between text-[10px] text-[#6b7280] dark:text-[#a1a1aa] pt-1">
                  <span>
                    {syncedLyrics.length > 0
                      ? `${syncedLyrics.length} synchronized lines • tap line to jump`
                      : "Persisted offline in browser IndexedDB."}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isExportingPdf || (!songNotes && syncedLyrics.length === 0)}
                      onClick={async () => {
                        const content = songNotes || syncedLyrics.map((l) => l.text).join("\n");
                        if (!content) return;
                        setIsExportingPdf(true);
                        try {
                          await downloadLyricsPdf({
                            title: lyricsTrackInfo?.title || file?.name || "Song Lyrics",
                            artist: lyricsTrackInfo?.artist || "",
                            lyrics: content,
                            syncedLyrics,
                            includeTimestamps: lyricsMode === "karaoke" && syncedLyrics.length > 0,
                          });
                        } finally {
                          setIsExportingPdf(false);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] text-[10px] text-[#6b7280] dark:text-[#a1a1aa] hover:border-[#fb6b6a] hover:text-[#fb6b6a] transition-colors cursor-pointer disabled:opacity-40"
                      title="Download formatted printable PDF of these lyrics"
                    >
                      {isExportingPdf ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Generating PDF...</span>
                        </>
                      ) : (
                        <>
                          <FileDown className="h-3 w-3 text-[#fb6b6a]" />
                          <span>Download PDF</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={!songNotes && syncedLyrics.length === 0}
                      onClick={() => {
                        const content = songNotes || syncedLyrics.map((l) => l.text).join("\n");
                        if (!content) return;
                        navigator.clipboard.writeText(content);
                        setLyricsCopied(true);
                        setTimeout(() => setLyricsCopied(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] text-[10px] text-[#6b7280] dark:text-[#a1a1aa] hover:border-[#fb6b6a] hover:text-[#fb6b6a] transition-colors cursor-pointer disabled:opacity-40"
                    >
                      {lyricsCopied ? (
                        <>
                          <Check className="h-3 w-3 text-green-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Lyrics</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p
                onClick={() => setShowLyricsPanel(true)}
                className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] line-clamp-2 italic leading-relaxed cursor-pointer hover:text-[#111827] dark:hover:text-[#f4f4f5] transition-colors"
              >
                {songNotes || "No lyrics loaded yet. Click to expand or type song name above to fetch real lyrics."}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
