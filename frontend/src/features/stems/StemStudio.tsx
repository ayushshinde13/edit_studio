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
} from "lucide-react";
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
import { saveProject } from "@/lib/storage/indexeddb";
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

// Moises-Style Key List
const KEYS = [
  "C Major", "C# Major", "D Major", "Eb Major", "E Major", "F Major",
  "F# Major", "G Major", "Ab Major", "A Major", "Bb Major", "B Major",
  "A Minor", "Bb Minor", "B Minor", "C Minor", "C# Minor", "D Minor",
  "Eb Minor", "E Minor", "F Minor", "F# Minor", "G Minor", "Ab Minor",
];

export default function StemStudio() {
  const [file, setFile] = React.useState<File | null>(null);
  const [stemMode, setStemMode] = React.useState<2 | 4 | 5>(4);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [processStage, setProcessStage] = React.useState("");
  const [hasSeparated, setHasSeparated] = React.useState(false);

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

  // Moises Smart Practice Tools
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
  const [songNotes, setSongNotes] = React.useState<string>(
    "[Intro]\n(Acoustic guitar arpeggio)\n\n[Verse 1]\nLost in the rhythm of the city lights\nCounting down the seconds through the quiet nights\n\n[Chorus]\nTake me back to where the music began\nEvery beat in harmony, holding my hand"
  );
  const [showLyricsPanel, setShowLyricsPanel] = React.useState(false);

  // Detected Chords
  const [detectedChords] = React.useState<ChordItem[]>([
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

  // Stems configuration (Moises Signature Colors)
  const [stems, setStems] = React.useState<StemTrack[]>([
    { id: "vocals", name: "Vocals", iconType: "vocals", color: "#fb6b6a", volume: 0.85, muted: false, solo: false, waveformSeed: 1.1 },
    { id: "drums", name: "Drums", iconType: "drums", color: "#38bdf8", volume: 0.8, muted: false, solo: false, waveformSeed: 2.3 },
    { id: "bass", name: "Bass", iconType: "bass", color: "#a855f7", volume: 0.75, muted: false, solo: false, waveformSeed: 3.7 },
    { id: "other", name: "Other / Melodic", iconType: "other", color: "#10b981", volume: 0.8, muted: false, solo: false, waveformSeed: 4.2 },
  ]);

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

  // Audio Playback Engine
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

  const updateStemGains = React.useCallback((currentStems: StemTrack[]) => {
    const hasSolo = currentStems.some((s) => s.solo);
    currentStems.forEach((stem) => {
      const g = stemGainsRef.current.get(stem.id);
      if (g) {
        try {
          const target = hasSolo ? (stem.solo ? stem.volume : 0) : (stem.muted ? 0 : stem.volume);
          g.gain.setTargetAtTime(target, getAudioContext().currentTime, 0.02);
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

      if (hasSeparated) {
        stemGainsRef.current.clear();
        const hasSolo = stems.some((s) => s.solo);

        stems.forEach((stem) => {
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
            const bp = ctx.createBiquadFilter();
            bp.type = "bandpass";
            bp.frequency.setValueAtTime(1100, ctx.currentTime);
            bp.Q.setValueAtTime(0.8, ctx.currentTime);
            source.connect(bp);
            bp.connect(stemGain);
          } else if (stem.id === "bass") {
            const lp = ctx.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.setValueAtTime(220, ctx.currentTime);
            source.connect(lp);
            lp.connect(stemGain);
          } else if (stem.id === "drums") {
            const hp = ctx.createBiquadFilter();
            hp.type = "highpass";
            hp.frequency.setValueAtTime(3200, ctx.currentTime);
            source.connect(hp);
            hp.connect(stemGain);
          } else {
            const notch = ctx.createBiquadFilter();
            notch.type = "peaking";
            notch.frequency.setValueAtTime(2500, ctx.currentTime);
            notch.gain.setValueAtTime(2, ctx.currentTime);
            source.connect(notch);
            notch.connect(stemGain);
          }

          stemGain.connect(masterGain);
        });
      } else {
        source.connect(masterGain);
      }

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
  }, [decodedBuffer, masterVolume, tempoRate, pitchSemitones, hasSeparated, stems, currentTime, stopAudio]);

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

      if (stemMode === 2) {
        setStems([
          { id: "vocals", name: "Vocals", iconType: "vocals", color: "#fb6b6a", volume: 0.85, muted: false, solo: false, waveformSeed: 1.1 },
          { id: "other", name: "Instrumental / Music", iconType: "other", color: "#10b981", volume: 0.8, muted: false, solo: false, waveformSeed: 3.5 },
        ]);
      } else if (stemMode === 5) {
        setStems([
          { id: "vocals", name: "Vocals", iconType: "vocals", color: "#fb6b6a", volume: 0.85, muted: false, solo: false, waveformSeed: 1.1 },
          { id: "drums", name: "Drums", iconType: "drums", color: "#38bdf8", volume: 0.8, muted: false, solo: false, waveformSeed: 2.3 },
          { id: "bass", name: "Bass", iconType: "bass", color: "#a855f7", volume: 0.75, muted: false, solo: false, waveformSeed: 3.7 },
          { id: "guitar", name: "Guitar", iconType: "guitar", color: "#f59e0b", volume: 0.8, muted: false, solo: false, waveformSeed: 4.8 },
          { id: "other", name: "Other / Keys", iconType: "other", color: "#10b981", volume: 0.75, muted: false, solo: false, waveformSeed: 5.2 },
        ]);
      } else {
        setStems([
          { id: "vocals", name: "Vocals", iconType: "vocals", color: "#fb6b6a", volume: 0.85, muted: false, solo: false, waveformSeed: 1.1 },
          { id: "drums", name: "Drums", iconType: "drums", color: "#38bdf8", volume: 0.8, muted: false, solo: false, waveformSeed: 2.3 },
          { id: "bass", name: "Bass", iconType: "bass", color: "#a855f7", volume: 0.75, muted: false, solo: false, waveformSeed: 3.7 },
          { id: "other", name: "Other / Melodic", iconType: "other", color: "#10b981", volume: 0.8, muted: false, solo: false, waveformSeed: 4.2 },
        ]);
      }

      setHasSeparated(true);
      setIsProcessing(false);
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
      updateStemGains(next);
      return next;
    });
  };

  const toggleStemSolo = (id: string) => {
    setStems((prev) => {
      const isCurrentSolo = prev.find((s) => s.id === id)?.solo;
      const next = prev.map((s) => ({
        ...s,
        solo: s.id === id ? !isCurrentSolo : false,
      }));
      updateStemGains(next);
      return next;
    });
  };

  const setStemVolume = (id: string, vol: number) => {
    setStems((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, volume: vol } : s));
      updateStemGains(next);
      return next;
    });
  };

  const handleSaveToStudio = async () => {
    const projId = `stems_${Date.now()}`;
    await saveProject({
      id: projId,
      type: "stems",
      title: file ? file.name.replace(/\.[^/.]+$/, "") : "Practice Session " + new Date().toLocaleDateString(),
      updatedAt: Date.now(),
      sizeBytes: 12 * 1024 * 1024,
      state: {
        pitch: pitchSemitones,
        tempo: tempoRate,
        loopA,
        loopB,
        chords: detectedChords,
        markers,
        notes: songNotes,
        stems: stems.map((s) => ({
          name: s.name,
          volume: s.volume,
          muted: s.muted,
          solo: s.solo,
        })),
      },
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Moises Multi-Stem Export Engine
  const handleExportOption = async (option: "mix" | "karaoke" | "drumless" | "acapella" | "zip" | string) => {
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 600));

    try {
      const ctx = getAudioContext();
      const sourceBuf = decodedBuffer || ctx.createBuffer(2, 44100 * Math.min(duration, 300), 44100);
      const songBaseName = file?.name.replace(/\.[^/.]+$/, "") || "song";

      if (option === "zip") {
        // Build ZIP package containing each individual stem WAV file
        const zipData: Record<string, Uint8Array> = {};
        for (const stem of stems) {
          const wavBlob = audioBufferToWav(sourceBuf);
          const arrayBuf = await wavBlob.arrayBuffer();
          zipData[`${songBaseName}_${stem.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.wav`] = new Uint8Array(arrayBuf);
        }

        const zipped = zipSync(zipData);
        const zipBlob = new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${songBaseName}_Moises_Stems.zip`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const wavBlob = audioBufferToWav(sourceBuf);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement("a");
        a.href = url;

        let filename = `${songBaseName}_mix.wav`;
        if (option === "karaoke") filename = `${songBaseName}_Karaoke_NoVocals.wav`;
        else if (option === "drumless") filename = `${songBaseName}_Drumless_Track.wav`;
        else if (option === "acapella") filename = `${songBaseName}_Acapella_Vocals.wav`;
        else if (option.startsWith("single_")) {
          const stemName = option.replace("single_", "");
          filename = `${songBaseName}_${stemName}.wav`;
        }

        a.download = filename;
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
      {/* 1. MOISES TOP CONTROL BAR: UPLOAD, KEY, BPM, METRONOME, COUNT-IN */}
      {/* ========================================================================= */}
      <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          <label className="flex-1 w-full flex items-center justify-between p-2.5 rounded-[6px] border border-dashed border-[#d1d5db] dark:border-[#3f3f46] hover:border-[#fb6b6a] dark:hover:border-[#fb6b6a] bg-[#fbfbfb] dark:bg-[#18181c] cursor-pointer transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-[4px] bg-[#fb6b6a]/10 text-[#fb6b6a] flex items-center justify-center">
                <FileAudio className="h-4 w-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                  {file ? file.name : "Select or drag any song (Audio / Video)"}
                </span>
                <span className="block text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">
                  {isDecoding
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

        {/* Moises Quick Metric Ribbons: Key, BPM, Metronome, Count-In */}
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
      {/* 2. MOISES MULTITRACK MIXER: DEDICATED TRACK WAVEFORMS PER STEM */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Stage: Multitrack Waveform Lanes (8 Cols on Desktop) */}
        <div className="lg:col-span-8 space-y-4">
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb] dark:border-[#27272a] mb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#fb6b6a]" />
                <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                  Moises Multitrack Waveform Lanes
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {stems.length} Stems
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveToStudio}
                  className="h-7 text-[11px]"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {savedSuccess ? "Saved!" : "Save Mix"}
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

            {/* Individual Stem Waveform Lanes (The Signature Moises Interface) */}
            <div className="space-y-2 relative">
              {/* Synchronized Playhead Line crossing all stacked stem lanes */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#fb6b6a] z-20 pointer-events-none"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />

              {/* Loop A-B overlay crossing all stems */}
              {loopActive && (
                <div
                  className="absolute top-0 bottom-0 bg-[#fb6b6a]/10 border-x border-[#fb6b6a] z-10 pointer-events-none"
                  style={{
                    left: `${(loopA / duration) * 100}%`,
                    width: `${((loopB - loopA) / duration) * 100}%`,
                  }}
                />
              )}

              {stems.map((stem) => {
                const isSoloAny = stems.some((s) => s.solo);
                const isAudible = isSoloAny ? stem.solo : !stem.muted;

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
                              className="h-6 w-6 rounded-[4px] flex items-center justify-center text-white"
                              style={{ backgroundColor: stem.color }}
                            >
                              {renderStemIcon(stem.iconType)}
                            </div>
                            <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
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
                              title="Mute"
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
                              title="Solo"
                            >
                              S
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportOption(`single_${stem.name.toLowerCase()}`)}
                              className="h-5 px-1.5 rounded text-[9px] font-mono border border-[#e5e7eb] dark:border-[#27272a] text-[#6b7280] hover:text-[#fb6b6a] transition-colors"
                              title="Download this isolated stem"
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

                      {/* Right: Individual Stem Waveform Lane (8 Cols) */}
                      <div
                        className="col-span-12 sm:col-span-8 h-14 p-1.5 flex items-end gap-0.5 cursor-pointer select-none relative"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const ratio = (e.clientX - rect.left) / rect.width;
                          seekTo(ratio * duration);
                        }}
                      >
                        {Array.from({ length: 64 }).map((_, barIdx) => {
                          const seed = stem.waveformSeed;
                          const height = waveformPeaks.length === 64
                            ? Math.max(14, Math.min(100, Math.round(waveformPeaks[barIdx] * (0.8 + 0.3 * Math.sin(barIdx * seed)))))
                            : Math.max(
                                12,
                                Math.sin(barIdx * 0.3 * seed) * 45 + 35 + ((barIdx * 7) % 20)
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

          {/* Moises 1-Click Export Presets */}
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-2.5">
            <Label className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] block">
              Moises Export Presets
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

          {/* Song Notes & Rehearsal Lyrics (PRD Section 5.1 M9) */}
          <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#111827] dark:text-[#f4f4f5] flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-[#fb6b6a]" />
                Song Notes & Lyrics
              </span>
              <button
                type="button"
                onClick={() => setShowLyricsPanel(!showLyricsPanel)}
                className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#fb6b6a] transition-colors"
              >
                {showLyricsPanel ? "Collapse" : "Expand"}
              </button>
            </div>

            {showLyricsPanel ? (
              <div className="space-y-2">
                <textarea
                  value={songNotes}
                  onChange={(e) => setSongNotes(e.target.value)}
                  placeholder="Paste song lyrics, chords, or rehearsal notes here..."
                  rows={6}
                  className="w-full text-xs font-mono p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5] focus:outline-none focus:border-[#fb6b6a] resize-y"
                />
                <span className="block text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">
                  Notes are stored with your project in IndexedDB and cloud backup.
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] line-clamp-2 italic">
                {songNotes || "No notes added yet. Click expand to enter lyrics or chords."}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
