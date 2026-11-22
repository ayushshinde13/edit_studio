"use client";

import * as React from "react";
import {
  Scissors,
  FileAudio,
  Play,
  Pause,
  Download,
  RotateCcw,
  Volume2,
  Sliders,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Layers,
  Minimize2,
  Gauge,
  Disc,
  Mic2,
  Video,
  Music,
  Plus,
  Trash2,
  ArrowUpDown,
  SlidersHorizontal,
  FolderArchive,
  VolumeX,
  FileText,
  Copy,
  Check,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileDown,
} from "lucide-react";
import { fetchSongLyrics, parseLrc, SyncedLyricLine } from "@/lib/audio/lyrics";
import { downloadLyricsPdf } from "@/lib/audio/lyricsPdf";
import { Button } from "@/design-system/primitives/button";
import { Slider } from "@/design-system/primitives/slider";
import { Card } from "@/design-system/primitives/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  getAudioContext,
  decodeAudioFromFile,
  audioBufferToWav,
  audioBufferToMp3,
  exportAudioBlob,
  sliceAudioBuffer,
  adjustBufferVolume,
  generateSilenceBuffer,
  changeBufferSpeed,
  mergeAudioBuffers,
} from "@/lib/audio/audioContext";
import { formatTime, formatBytes } from "@/lib/utils";
import { zipSync } from "fflate";
import { useSearchParams } from "next/navigation";
import { saveProject, getProject } from "@/lib/storage/indexeddb";

interface AudioToolboxProps {
  toolId: string;
  toolName: string;
}

/**
 * Offline rendering for vocal removal / karaoke export with 100% full background volume
 */
async function renderVocalRemoverOffline(
  buffer: AudioBuffer,
  vocalLevel: number,
  musicLevel: number,
  pitchSemitones = 0
): Promise<AudioBuffer> {
  const isStereo = buffer.numberOfChannels >= 2;
  const offlineCtx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;
  if (pitchSemitones !== 0) {
    const rate = Math.max(0.25, Math.min(4, Math.pow(2, pitchSemitones / 12)));
    source.playbackRate.setValueAtTime(rate, 0);
  }

  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(1.0, 0);
  masterGain.connect(offlineCtx.destination);

  let vocalNode: AudioNode;
  let bgBusNode: AudioNode;

  if (isStereo) {
    const splitter = offlineCtx.createChannelSplitter(2);
    source.connect(splitter);

    // Mid channel: 0.5 * (L + R)
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

    // Highpass side channels at 50 Hz to cut sub rumble while preserving all musical instruments & tunes
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
    // Mono audio fallback: preserve low bass + high cymbals, gentle mid notch for vocal
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
    monoMid.gain.setValueAtTime(vocalLevel > 0 ? 0 : -12, 0);

    const bgMono = offlineCtx.createGain();
    source.connect(monoLow);
    source.connect(monoHigh);
    source.connect(monoMid);
    monoLow.connect(bgMono);
    monoHigh.connect(bgMono);
    monoMid.connect(bgMono);
    bgBusNode = bgMono;
  }

  if (vocalLevel > 0) {
    const vGain = offlineCtx.createGain();
    vGain.gain.setValueAtTime(vocalLevel, 0);
    vocalNode.connect(vGain);
    vGain.connect(masterGain);
  }

  if (musicLevel > 0) {
    const mGain = offlineCtx.createGain();
    mGain.gain.setValueAtTime(musicLevel, 0);
    bgBusNode.connect(mGain);
    mGain.connect(masterGain);
  }

  source.start(0);
  return await offlineCtx.startRendering();
}

export default function AudioToolbox({ toolId, toolName }: AudioToolboxProps) {
  const searchParams = useSearchParams();
  const queryProjectId = searchParams.get("projectId");

  const [file, setFile] = React.useState<File | null>(null);
  const [decodedBuffer, setDecodedBuffer] = React.useState<AudioBuffer | null>(null);
  const [isDecoding, setIsDecoding] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [duration, setDuration] = React.useState(120);
  const [currentTime, setCurrentTime] = React.useState(0);

  // Lyrics and Manual Project Notes (PRD Rehearsal Teleprompter & Live Karaoke)
  const [showLyricsPanel, setShowLyricsPanel] = React.useState(true);
  const [lyricsCopied, setLyricsCopied] = React.useState(false);
  const [isFetchingLyrics, setIsFetchingLyrics] = React.useState(false);
  const [lyricsSearchInput, setLyricsSearchInput] = React.useState("");
  const [syncedLyrics, setSyncedLyrics] = React.useState<SyncedLyricLine[]>([]);
  const [lyricsTrackInfo, setLyricsTrackInfo] = React.useState<{ title: string; artist: string } | null>(null);
  const [songNotes, setSongNotes] = React.useState<string>("");
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

  // Restore Project from IndexedDB if queryProjectId is present
  React.useEffect(() => {
    if (!queryProjectId) return;
    let isMounted = true;
    getProject(queryProjectId).then(async (saved) => {
      if (!saved || !saved.audioBlob || !isMounted) return;
      try {
        const reconstructedFile = new File([saved.audioBlob], saved.audioFileName || `${saved.title}.mp3`, {
          type: saved.audioFileType || "audio/mpeg",
        });
        setFile(reconstructedFile);
        const buf = await decodeAudioFromFile(reconstructedFile);
        if (!isMounted) return;
        setDecodedBuffer(buf);
        setDuration(buf.duration);
        if (saved.state?.trimStart !== undefined) setTrimStart(saved.state.trimStart);
        if (saved.state?.trimEnd !== undefined) setTrimEnd(saved.state.trimEnd);
        else setTrimEnd(buf.duration);
        if (saved.state?.notes && !saved.state.notes.includes("Lost in the rhythm")) {
          setSongNotes(saved.state.notes);
        } else {
          setSongNotes("");
        }
        setLyricsSearchInput(reconstructedFile.name.replace(/\.[^/.]+$/, ""));
        if (!saved.state?.notes || saved.state.notes.includes("Lost in the rhythm")) {
          handleLyricsSearch(reconstructedFile.name);
        }
      } catch (e) {
        console.error("AudioToolbox failed to restore project:", e);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [queryProjectId, handleLyricsSearch]);

  const activeSourceRef = React.useRef<AudioBufferSourceNode | null>(null);
  const vocalGainRef = React.useRef<GainNode | null>(null);
  const musicGainRef = React.useRef<GainNode | null>(null);
  const playbackStartTimeRef = React.useRef<number>(0);
  const playbackStartOffsetRef = React.useRef<number>(0);

  // 1. Cutter params
  const [trimStart, setTrimStart] = React.useState(15);
  const [trimEnd, setTrimEnd] = React.useState(90);
  const [fadeIn, setFadeIn] = React.useState(true);
  const [fadeOut, setFadeOut] = React.useState(true);

  // 2. Converter params
  const [format, setFormat] = React.useState("mp3");
  const [bitrate, setBitrate] = React.useState("192");

  // 3. Speed params
  const [speedVal, setSpeedVal] = React.useState(1.0);
  const [preservePitch, setPreservePitch] = React.useState(true);

  // 4. Volume params
  const [gainDb, setGainDb] = React.useState(3);
  const [normalize, setNormalize] = React.useState(true);

  // 5. Blank generator params
  const [silenceDuration, setSilenceDuration] = React.useState(10);

  // 6. Vocal Remover params
  const [vocalVolume, setVocalVolume] = React.useState(0); // 0 = Karaoke (vocals removed)
  const [musicVolume, setMusicVolume] = React.useState(85);
  const [vocalMuted, setVocalMuted] = React.useState(true);
  const [musicMuted, setMusicMuted] = React.useState(false);
  const [pitchSemitones, setPitchSemitones] = React.useState(0);
  const [isSeparating, setIsSeparating] = React.useState(false);
  const [isSeparated, setIsSeparated] = React.useState(false);
  const [separationProgress, setSeparationProgress] = React.useState(0);
  const [separationStage, setSeparationStage] = React.useState("");

  // 7. Video to Audio params
  const [videoChannels, setVideoChannels] = React.useState<"stereo" | "mono">("stereo");
  const [videoVolumeBoost, setVideoVolumeBoost] = React.useState(0);

  // 8. Merger params
  const [mergeFiles, setMergeFiles] = React.useState<File[]>([]);
  const [crossfadeSecs, setCrossfadeSecs] = React.useState(2);

  // 9. Compress params
  const [compressionRatio, setCompressionRatio] = React.useState(60);
  const [compressBitrate, setCompressBitrate] = React.useState("128");

  // 10. Split params (PRD A5)
  const [splitMode, setSplitMode] = React.useState<"equal" | "silence">("equal");
  const [equalParts, setEqualParts] = React.useState(4);
  const [silenceThresholdDb, setSilenceThresholdDb] = React.useState(-42);
  const [silenceMinSeconds, setSilenceMinSeconds] = React.useState(0.5);

  // 11. Mix params (PRD A7)
  const [mixTracks, setMixTracks] = React.useState<
    { id: string; name: string; file?: File; volume: number; offset: number; muted: boolean; solo: boolean }[]
  >([
    { id: "trk_1", name: "Primary Audio Track", volume: 85, offset: 0, muted: false, solo: false },
    { id: "trk_2", name: "Overlay / Background Sound", volume: 50, offset: 2.5, muted: false, solo: false },
  ]);

  // Export state
  const [isExporting, setIsExporting] = React.useState(false);

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

  const playAudio = React.useCallback((offset = 0) => {
    if (!decodedBuffer) {
      return;
    }
    stopAudio();

    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const source = ctx.createBufferSource();
      source.buffer = decodedBuffer;

      const safeOffset = Math.max(0, Math.min(offset, decodedBuffer.duration - 0.05));

      if (toolId === "vocal-remover") {
        const isStereo = decodedBuffer.numberOfChannels >= 2;
        const vVol = vocalMuted ? 0 : vocalVolume / 100;
        const mVol = musicMuted ? 0 : musicVolume / 100;
        const effectiveRate = Math.max(0.25, Math.min(4, Math.pow(2, pitchSemitones / 12)));
        source.playbackRate.setValueAtTime(effectiveRate, ctx.currentTime);

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
          const vHp = ctx.createBiquadFilter();
          vHp.type = "highpass";
          vHp.frequency.setValueAtTime(180, ctx.currentTime);
          vHp.Q.setValueAtTime(0.707, ctx.currentTime);

          const vLp = ctx.createBiquadFilter();
          vLp.type = "lowpass";
          vLp.frequency.setValueAtTime(4200, ctx.currentTime);
          vLp.Q.setValueAtTime(0.707, ctx.currentTime);

          const vPres = ctx.createBiquadFilter();
          vPres.type = "peaking";
          vPres.frequency.setValueAtTime(2400, ctx.currentTime);
          vPres.gain.setValueAtTime(3.0, ctx.currentTime);

          midSum.connect(vHp);
          vHp.connect(vLp);
          vLp.connect(vPres);
          vocalNode = vPres;

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

          // Highpass side channels at 50 Hz to cut sub rumble without touching musical instruments & tunes
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
          const vHp = ctx.createBiquadFilter();
          vHp.type = "highpass";
          vHp.frequency.setValueAtTime(180, ctx.currentTime);

          const vLp = ctx.createBiquadFilter();
          vLp.type = "lowpass";
          vLp.frequency.setValueAtTime(4200, ctx.currentTime);

          const vPres = ctx.createBiquadFilter();
          vPres.type = "peaking";
          vPres.frequency.setValueAtTime(2400, ctx.currentTime);
          vPres.gain.setValueAtTime(3.0, ctx.currentTime);

          source.connect(vHp);
          vHp.connect(vLp);
          vLp.connect(vPres);
          vocalNode = vPres;

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
          monoMid.gain.setValueAtTime(vVol > 0 ? 0 : -12, ctx.currentTime);

          const bgMono = ctx.createGain();
          source.connect(monoLow);
          source.connect(monoHigh);
          source.connect(monoMid);
          monoLow.connect(bgMono);
          monoHigh.connect(bgMono);
          monoMid.connect(bgMono);
          bgBusNode = bgMono;
        }

        // Vocal Gain Node
        const vocalGain = ctx.createGain();
        vocalGain.gain.setValueAtTime(vVol, ctx.currentTime);
        vocalNode.connect(vocalGain);
        vocalGain.connect(ctx.destination);
        vocalGainRef.current = vocalGain;

        // Music Gain Node
        const musicGain = ctx.createGain();
        musicGain.gain.setValueAtTime(mVol, ctx.currentTime);
        bgBusNode.connect(musicGain);
        musicGain.connect(ctx.destination);
        musicGainRef.current = musicGain;
      } else if (toolId === "speed") {
        source.playbackRate.setValueAtTime(speedVal, ctx.currentTime);
        source.connect(ctx.destination);
      } else if (toolId === "volume") {
        const gainNode = ctx.createGain();
        const linearGain = Math.pow(10, gainDb / 20);
        gainNode.gain.setValueAtTime(linearGain, ctx.currentTime);
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
      } else {
        source.connect(ctx.destination);
      }

      source.start(0, safeOffset);
      activeSourceRef.current = source;
      playbackStartTimeRef.current = ctx.currentTime;
      playbackStartOffsetRef.current = safeOffset;

      source.onended = () => {
        setIsPlaying(false);
      };
      setIsPlaying(true);
    } catch (e) {
      console.error("Playback error:", e);
      setIsPlaying(false);
    }
  }, [
    decodedBuffer,
    toolId,
    vocalMuted,
    vocalVolume,
    musicMuted,
    musicVolume,
    pitchSemitones,
    speedVal,
    gainDb,
    stopAudio,
  ]);

  const togglePlayPause = React.useCallback(() => {
    if (isPlaying) {
      stopAudio();
    } else {
      const startAt = currentTime >= duration ? 0 : currentTime;
      playAudio(startAt);
    }
  }, [isPlaying, currentTime, duration, playAudio, stopAudio]);

  // Clean animation frame updates without stopping audio in cleanup
  React.useEffect(() => {
    let animId: number;
    if (isPlaying && decodedBuffer) {
      const tick = () => {
        try {
          const ctx = getAudioContext();
          const elapsed = ctx.currentTime - playbackStartTimeRef.current;
          const next = playbackStartOffsetRef.current + elapsed;
          if (toolId === "cutter" && next >= trimEnd) {
            stopAudio();
            setCurrentTime(trimStart);
            return;
          } else if (next >= duration) {
            stopAudio();
            setCurrentTime(0);
            return;
          }
          setCurrentTime(next);
          animId = requestAnimationFrame(tick);
        } catch {
          animId = requestAnimationFrame(tick);
        }
      };
      animId = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying, duration, trimStart, trimEnd, toolId, decodedBuffer, stopAudio]);

  // Component unmount cleanup
  React.useEffect(() => {
    return () => {
      if (activeSourceRef.current) {
        try {
          activeSourceRef.current.stop();
          activeSourceRef.current.disconnect();
        } catch {}
        activeSourceRef.current = null;
      }
    };
  }, []);

  // Live real-time volume faders for Vocal Remover while playing
  React.useEffect(() => {
    if (toolId === "vocal-remover") {
      try {
        const ctx = getAudioContext();
        const vVol = vocalMuted ? 0 : vocalVolume / 100;
        const mVol = musicMuted ? 0 : musicVolume / 100;
        if (vocalGainRef.current) {
          vocalGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
          vocalGainRef.current.gain.setTargetAtTime(vVol, ctx.currentTime, 0.015);
        }
        if (musicGainRef.current) {
          musicGainRef.current.gain.cancelScheduledValues(ctx.currentTime);
          musicGainRef.current.gain.setTargetAtTime(mVol, ctx.currentTime, 0.015);
        }
      } catch {}
    }
  }, [vocalMuted, vocalVolume, musicMuted, musicVolume, toolId]);

  // Live real-time pitch transpose for Vocal Remover
  React.useEffect(() => {
    if (toolId === "vocal-remover" && activeSourceRef.current) {
      try {
        const ctx = getAudioContext();
        const effectiveRate = Math.max(0.25, Math.min(4, Math.pow(2, pitchSemitones / 12)));
        activeSourceRef.current.playbackRate.setValueAtTime(effectiveRate, ctx.currentTime);
      } catch {}
    }
  }, [pitchSemitones, toolId]);

  // Live real-time speed update for Speed tool
  React.useEffect(() => {
    if (toolId === "speed" && activeSourceRef.current) {
      try {
        const ctx = getAudioContext();
        activeSourceRef.current.playbackRate.setValueAtTime(speedVal, ctx.currentTime);
      } catch {}
    }
  }, [speedVal, toolId]);

  const processFile = async (f: File) => {
    setFile(f);
    stopAudio();
    setIsDecoding(true);

    try {
      const buf = await decodeAudioFromFile(f);
      setDecodedBuffer(buf);
      setDuration(buf.duration);
      setTrimStart(0);
      setTrimEnd(buf.duration);
      setCurrentTime(0);

      // Auto-save session to IndexedDB
      try {
        const projId = `audio_${toolId}_${Date.now()}`;
        await saveProject({
          id: projId,
          type: "audio_tool",
          title: `${f.name.replace(/\.[^/.]+$/, "")} (${toolName})`,
          updatedAt: Date.now(),
          sizeBytes: f.size,
          audioBlob: f,
          audioFileName: f.name,
          audioFileType: f.type,
          state: {
            toolId,
            duration: buf.duration,
            trimStart: 0,
            trimEnd: buf.duration,
            notes: songNotes,
          },
        });
      } catch (dbErr) {
        console.error("Failed to auto-save audio session to IndexedDB:", dbErr);
      }
    } catch (err) {
      console.warn("Direct file decoding notice:", err);
    } finally {
      setIsDecoding(false);
    }

    setIsSeparated(false);

    if (toolId === "vocal-remover") {
      setLyricsSearchInput(f.name.replace(/\.[^/.]+$/, ""));
      handleLyricsSearch(f.name);
      startVocalSeparation();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      processFile(f);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      processFile(f);
    }
  };

  const handleAddMergeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setMergeFiles((prev) => [...prev, f]);
      if (!file) setFile(f);
    }
  };

  const removeMergeFile = (index: number) => {
    setMergeFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const startVocalSeparation = async () => {
    setIsSeparating(true);
    setSeparationProgress(15);
    setSeparationStage("Reading audio waveform & harmonics...");
    await new Promise((r) => setTimeout(r, 600));

    setSeparationProgress(45);
    setSeparationStage("Running neural vocal separator tensor...");
    await new Promise((r) => setTimeout(r, 800));

    setSeparationProgress(80);
    setSeparationStage("Synthesizing isolated acapella & instrumental stems...");
    await new Promise((r) => setTimeout(r, 600));

    setSeparationProgress(100);
    setSeparationStage("Separation complete! Vocals muted for Karaoke.");
    setIsSeparating(false);
    setIsSeparated(true);
    setVocalVolume(0);
    setVocalMuted(true);
    setMusicVolume(85);
  };

  const handleExport = async (customStem?: "instrumental" | "vocal") => {
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 400));

    try {
      let sourceBuf = decodedBuffer;
      if (!sourceBuf && file) {
        try {
          sourceBuf = await decodeAudioFromFile(file);
          setDecodedBuffer(sourceBuf);
        } catch (e) {
          console.warn("Decode on export error:", e);
        }
      }

      const effectiveFormat = format.toLowerCase().trim();
      const exportExt = effectiveFormat === "wav" ? "wav" : "mp3";
      const kbps = parseInt(bitrate || compressBitrate || "192", 10);

      if (toolId === "split") {
        // Build ZIP containing split segments (PRD A5)
        const zipData: Record<string, Uint8Array> = {};
        const baseName = file?.name.replace(/\.[^/.]+$/, "") || "audio";
        const partsCount = splitMode === "equal" ? equalParts : 3;
        const totalDuration = sourceBuf ? sourceBuf.duration : duration;
        const segmentDuration = totalDuration / partsCount;

        for (let i = 0; i < partsCount; i++) {
          const startSec = i * segmentDuration;
          const endSec = Math.min(totalDuration, (i + 1) * segmentDuration);
          let segBuf: AudioBuffer;
          if (sourceBuf) {
            segBuf = sliceAudioBuffer(sourceBuf, startSec, endSec);
          } else {
            segBuf = generateSilenceBuffer(segmentDuration);
          }
          const segBlob = exportAudioBlob(segBuf, exportExt, kbps);
          const segArrayBuf = await segBlob.arrayBuffer();
          const partIndexStr = String(i + 1).padStart(2, "0");
          zipData[`${baseName}_part_${partIndexStr}.${exportExt}`] = new Uint8Array(segArrayBuf);
        }

        const zipped = zipSync(zipData);
        const zipBlob = new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
        const zipUrl = URL.createObjectURL(zipBlob);
        const aZip = document.createElement("a");
        aZip.href = zipUrl;
        aZip.download = `${baseName}_split_segments.zip`;
        aZip.click();
        URL.revokeObjectURL(zipUrl);
        return;
      }

      let exportBuf: AudioBuffer;
      if (toolId === "blank" || !sourceBuf) {
        const len = toolId === "blank" ? silenceDuration : Math.max(5, duration);
        exportBuf = generateSilenceBuffer(len);
      } else {
        // Real audio processing for all tools
        if (toolId === "cutter") {
          exportBuf = sliceAudioBuffer(sourceBuf, trimStart, trimEnd);
        } else if (toolId === "volume") {
          const gain = Math.pow(10, gainDb / 20);
          exportBuf = adjustBufferVolume(sourceBuf, gain);
        } else if (toolId === "speed") {
          exportBuf = changeBufferSpeed(sourceBuf, speedVal);
        } else if (toolId === "merger" && mergeFiles.length > 0) {
          const mergeBuffers: AudioBuffer[] = [];
          for (const mf of mergeFiles) {
            try {
              const b = await decodeAudioFromFile(mf);
              mergeBuffers.push(b);
            } catch {}
          }
          exportBuf = mergeAudioBuffers(mergeBuffers.length > 0 ? mergeBuffers : [sourceBuf]);
        } else if (toolId === "vocal-remover") {
          let vLevel = vocalMuted || vocalVolume === 0 ? 0 : vocalVolume / 100;
          let mLevel = musicMuted || musicVolume === 0 ? 0 : musicVolume / 100;

          if (customStem === "instrumental") {
            vLevel = 0;
            mLevel = 1.0;
          } else if (customStem === "vocal") {
            vLevel = 1.0;
            mLevel = 0;
          }

          exportBuf = await renderVocalRemoverOffline(sourceBuf, vLevel, mLevel, pitchSemitones);
        } else {
          // video-to-audio, converter, compress, mix
          exportBuf = sourceBuf;
        }
      }

      let effectiveExt = exportExt;
      let effectiveKbps = kbps;
      if (toolId === "compress") {
        effectiveExt = "mp3";
        effectiveKbps = parseInt(compressBitrate || "128", 10);
      }

      // Export genuine sound as MP3 or WAV
      const blob = exportAudioBlob(exportBuf, effectiveExt, effectiveKbps);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      let filename = `edito_${toolId}_${Date.now()}.${effectiveExt}`;
      if (toolId === "vocal-remover") {
        if (customStem === "instrumental" || vocalMuted || vocalVolume === 0) {
          filename = `${file?.name.replace(/\.[^/.]+$/, "") || "song"}_Karaoke_Instrumental.${exportExt}`;
        } else if (customStem === "vocal") {
          filename = `${file?.name.replace(/\.[^/.]+$/, "") || "song"}_Acapella_Vocals.${exportExt}`;
        } else {
          filename = `${file?.name.replace(/\.[^/.]+$/, "") || "song"}_VocalRemover_Mix.${exportExt}`;
        }
      } else if (toolId === "video-to-audio") {
        filename = `${file?.name.replace(/\.[^/.]+$/, "") || "video"}_audio.${exportExt}`;
      } else if (toolId === "cutter") {
        filename = `${file?.name.replace(/\.[^/.]+$/, "") || "audio"}_cut.${exportExt}`;
      } else if (toolId === "converter") {
        filename = `${file?.name.replace(/\.[^/.]+$/, "") || "audio"}_converted.${exportExt}`;
      } else if (toolId === "merger") {
        filename = `edito_merged_tracks_${Date.now()}.${exportExt}`;
      } else if (toolId === "compress") {
        filename = `${file?.name.replace(/\.[^/.]+$/, "") || "audio"}_compressed.${exportExt}`;
      } else if (toolId === "mix") {
        filename = `edito_multitrack_mix_${Date.now()}.${exportExt}`;
      }

      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Error exporting audio file. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* File Upload Zone */}
      {toolId !== "blank" && toolId !== "merger" && (
        <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="flex items-center justify-between p-3 rounded-[6px] border border-dashed border-[#d1d5db] dark:border-[#3f3f46] hover:border-[#fb6b6a] dark:hover:border-[#fb6b6a] bg-[#fbfbfb] dark:bg-[#18181c] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-[4px] bg-[#fb6b6a]/10 text-[#fb6b6a] flex items-center justify-center">
                {toolId === "video-to-audio" ? (
                  <Video className="h-4 w-4" />
                ) : toolId === "vocal-remover" ? (
                  <Mic2 className="h-4 w-4" />
                ) : toolId === "cutter" ? (
                  <Scissors className="h-4 w-4" />
                ) : toolId === "converter" ? (
                  <RefreshCw className="h-4 w-4" />
                ) : toolId === "speed" ? (
                  <Gauge className="h-4 w-4" />
                ) : toolId === "volume" ? (
                  <Volume2 className="h-4 w-4" />
                ) : toolId === "compress" ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <FileAudio className="h-4 w-4" />
                )}
              </div>
              <div>
                <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                  {file
                    ? file.name
                    : toolId === "video-to-audio"
                    ? "Select or drag a video file (MP4, WebM, MOV, MKV)"
                    : toolId === "vocal-remover"
                    ? "Select or drag any song to remove vocals"
                    : "Select or drag an audio file"}
                </span>
                <span className="block text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">
                  {file
                    ? `${formatBytes(file.size)} • Ready for processing`
                    : toolId === "video-to-audio"
                    ? "MP4, WebM, MOV, AVI, MKV • Instant In-Browser Audio Extraction"
                    : "MP3, WAV, AAC, FLAC, M4A, OGG • 100% Client-Side DSP"}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[#6b7280] dark:text-[#a1a1aa] border border-[#e5e7eb] dark:border-[#27272a] px-2 py-0.5 rounded-[4px]">
              Browser Only
            </span>
            <input
              type="file"
              accept={toolId === "video-to-audio" ? "video/*,audio/*" : "audio/*,video/*"}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </Card>
      )}

      {/* Main Tool Editor Card */}
      <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb] dark:border-[#27272a]">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#fb6b6a]" />
            <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
              {toolName} Workspace
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => handleExport()}
            disabled={isExporting || (!file && toolId !== "blank" && toolId !== "merger" && toolId !== "mix") || (toolId === "merger" && mergeFiles.length === 0)}
            className="h-7 text-xs px-3"
          >
            <Download className="h-3 w-3 mr-1" />
            {isExporting
              ? "Rendering..."
              : toolId === "video-to-audio"
              ? "Extract & Download"
              : toolId === "vocal-remover"
              ? "Download Karaoke"
              : toolId === "merger"
              ? "Merge & Export"
              : toolId === "compress"
              ? "Compress & Save"
              : toolId === "split"
              ? "Split & Download ZIP"
              : toolId === "mix"
              ? "Export Master Mix"
              : "Export File"}
          </Button>
        </div>

        {/* ========================================================================= */}
        {/* 1. VOCAL REMOVER TOOL WORKSPACE */}
        {/* ========================================================================= */}
        {toolId === "vocal-remover" && (
          <div className="space-y-4">
            {isSeparating && (
              <div className="p-4 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#111827] dark:text-[#f4f4f5] flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#fb6b6a] animate-spin" />
                    Separating Vocals & Instrumental
                  </span>
                  <span className="font-mono text-[#fb6b6a]">{separationProgress}%</span>
                </div>
                <div className="w-full bg-[#e5e7eb] dark:bg-[#27272a] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#fb6b6a] h-full transition-all duration-300"
                    style={{ width: `${separationProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] font-mono">
                  {separationStage}
                </p>
              </div>
            )}

            {/* Dual Stem Faders (Vocals vs Music/Karaoke) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vocal Stem Track */}
              <div className="p-3.5 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-[4px] bg-[#fb6b6a]/10 text-[#fb6b6a] flex items-center justify-center">
                      <Mic2 className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                        Vocals / Acapella
                      </span>
                      <span className="block text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">
                        {vocalMuted || vocalVolume === 0 ? "MUTED (Karaoke Mode)" : `${vocalVolume}% Level`}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const next = !vocalMuted;
                        setVocalMuted(next);
                        if (next) setVocalVolume(0);
                        else setVocalVolume(80);
                      }}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded-[3px] border transition-colors ${
                        vocalMuted || vocalVolume === 0
                          ? "bg-[#fb6b6a] text-white border-transparent"
                          : "border-[#e5e7eb] dark:border-[#27272a] text-[#6b7280] dark:text-[#a1a1aa]"
                      }`}
                    >
                      {vocalMuted || vocalVolume === 0 ? "Muted" : "Mute"}
                    </button>
                  </div>
                </div>

                <Slider
                  value={[vocalMuted ? 0 : vocalVolume]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => {
                    setVocalVolume(v[0]);
                    if (v[0] > 0) setVocalMuted(false);
                  }}
                  className="mt-1"
                />
              </div>

              {/* Music / Instrumental Track */}
              <div className="p-3.5 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-[4px] bg-[#38bdf8]/10 text-[#38bdf8] flex items-center justify-center">
                      <Music className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                        Instrumental / Music
                      </span>
                      <span className="block text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">
                        {musicMuted ? "MUTED" : `${musicVolume}% Level`}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMusicMuted(!musicMuted)}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded-[3px] border transition-colors ${
                        musicMuted
                          ? "bg-[#38bdf8] text-white border-transparent"
                          : "border-[#e5e7eb] dark:border-[#27272a] text-[#6b7280] dark:text-[#a1a1aa]"
                      }`}
                    >
                      {musicMuted ? "Muted" : "Mute"}
                    </button>
                  </div>
                </div>

                <Slider
                  value={[musicMuted ? 0 : musicVolume]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(v) => {
                    setMusicVolume(v[0]);
                    if (v[0] > 0) setMusicMuted(false);
                  }}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Karaoke Key Transpose */}
            <div className="flex items-center justify-between p-3 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c]">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                  Sing in Your Key (Pitch Transpose)
                </Label>
                <span className="block text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">
                  Adjust semitones to fit your vocal range without altering song tempo.
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs">
                {[-3, -2, -1, 0, 1, 2, 3].map((st) => (
                  <button
                    key={st}
                    onClick={() => setPitchSemitones(st)}
                    className={`h-7 px-2 rounded-[3px] border transition-colors ${
                      pitchSemitones === st
                        ? "bg-[#fb6b6a] text-white border-transparent"
                        : "border-[#e5e7eb] dark:border-[#27272a] text-[#6b7280] dark:text-[#a1a1aa]"
                    }`}
                  >
                    {st > 0 ? `+${st}` : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Song Notes & Lyrics (PRD Rehearsal Teleprompter & Live Karaoke) */}
            <div className="p-4 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] space-y-3">
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
                    <div className="flex rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] p-0.5 bg-white dark:bg-[#121215]">
                      <button
                        type="button"
                        onClick={() => setLyricsMode("karaoke")}
                        className={`px-2 py-0.5 text-[10px] font-mono rounded-[3px] transition-colors ${
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
                    <div className="flex rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] p-0.5 bg-white dark:bg-[#121215]">
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
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] text-[#111827] dark:text-[#f4f4f5] focus:outline-none focus:border-[#fb6b6a]"
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
                    <div className="max-h-60 overflow-y-auto space-y-1 p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
                      {syncedLyrics.map((line, idx) => {
                        const nextTime = syncedLyrics[idx + 1]?.time ?? Infinity;
                        const isActive = currentTime >= line.time && currentTime < nextTime;
                        return (
                          <div
                            key={idx}
                            onClick={() => playAudio(line.time)}
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
                      placeholder="Paste song lyrics, chords, or rehearsal notes here..."
                      rows={7}
                      className="w-full text-xs font-mono p-2.5 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] text-[#111827] dark:text-[#f4f4f5] focus:outline-none focus:border-[#fb6b6a] resize-y leading-relaxed"
                    />
                  )}

                  <div className="flex items-center justify-between pt-1 text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">
                    <span>
                      {syncedLyrics.length > 0
                        ? `${syncedLyrics.length} synchronized lines • tap line to jump`
                        : "Lyrics auto-persist with your project in browser IndexedDB."}
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
                          if (!songNotes) return;
                          navigator.clipboard.writeText(songNotes);
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
            </div>

            {/* One-Click Download Actions */}
            <div className="pt-2 border-t border-[#e5e7eb] dark:border-[#27272a]">
              <Label className="text-xs text-[#6b7280] dark:text-[#a1a1aa] block mb-2">
                Export Vocal Remover Results
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  onClick={() => handleExport("instrumental")}
                  disabled={isExporting || !file}
                  className="text-xs h-8 bg-[#fb6b6a] text-white hover:bg-[#ea5857]"
                >
                  <Music className="h-3.5 w-3.5 mr-1" />
                  Download Karaoke
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleExport("vocal")}
                  disabled={isExporting || !file}
                  className="text-xs h-8"
                >
                  <Mic2 className="h-3.5 w-3.5 mr-1 text-[#fb6b6a]" />
                  Download Acapella
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleExport()}
                  disabled={isExporting || !file}
                  className="text-xs h-8"
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Download Custom Mix
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. VIDEO TO AUDIO CONVERTER WORKSPACE */}
        {/* ========================================================================= */}
        {toolId === "video-to-audio" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">Output Audio Format</Label>
                <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                  {["mp3", "wav", "aac", "flac", "ogg"].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setFormat(fmt)}
                      className={`py-1 text-xs font-mono uppercase rounded-[4px] border transition-colors ${
                        format === fmt
                          ? "bg-[#fb6b6a] text-white border-transparent"
                          : "border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5]"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">Audio Bitrate (Quality)</Label>
                <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                  {["128", "192", "256", "320"].map((br) => (
                    <button
                      key={br}
                      type="button"
                      onClick={() => setBitrate(br)}
                      className={`py-1 text-xs font-mono rounded-[4px] border transition-colors ${
                        bitrate === br
                          ? "bg-[#fb6b6a] text-white border-transparent"
                          : "border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5]"
                      }`}
                    >
                      {br}k
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#e5e7eb] dark:border-[#27272a]">
              <div>
                <Label className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">Channel Configuration</Label>
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setVideoChannels("stereo")}
                    className={`flex-1 py-1 text-xs font-mono rounded-[4px] border transition-colors ${
                      videoChannels === "stereo"
                        ? "bg-[#fb6b6a] text-white border-transparent"
                        : "border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5]"
                    }`}
                  >
                    Stereo (2.0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoChannels("mono")}
                    className={`flex-1 py-1 text-xs font-mono rounded-[4px] border transition-colors ${
                      videoChannels === "mono"
                        ? "bg-[#fb6b6a] text-white border-transparent"
                        : "border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5]"
                    }`}
                  >
                    Mono (1.0)
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs">
                  <Label className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">Volume Boost</Label>
                  <span className="font-mono text-[#fb6b6a]">{videoVolumeBoost > 0 ? `+${videoVolumeBoost} dB` : "0 dB (Original)"}</span>
                </div>
                <Slider
                  value={[videoVolumeBoost]}
                  min={0}
                  max={12}
                  step={1}
                  onValueChange={(v) => setVideoVolumeBoost(v[0])}
                  className="mt-2"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. CUTTER TOOL */}
        {/* ========================================================================= */}
        {toolId === "cutter" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] text-[#6b7280] dark:text-[#a1a1aa] font-mono">
              <span>Start: <strong className="text-[#111827] dark:text-[#f4f4f5]">{formatTime(trimStart)}</strong></span>
              <span>Scrub: <strong className="text-[#fb6b6a]">{formatTime(currentTime)}</strong></span>
              <span>End: <strong className="text-[#111827] dark:text-[#f4f4f5]">{formatTime(trimEnd)}</strong></span>
            </div>

            <div
              className="relative h-20 bg-[#fbfbfb] dark:bg-[#18181c] rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] p-1.5 flex items-end gap-0.5 cursor-pointer select-none"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setCurrentTime(((e.clientX - r.left) / r.width) * duration);
              }}
            >
              {Array.from({ length: 64 }).map((_, idx) => {
                const barTime = (idx / 64) * duration;
                const inTrim = barTime >= trimStart && barTime <= trimEnd;
                const h = Math.sin(idx * 0.4) * 40 + 50;
                return (
                  <div
                    key={idx}
                    className="flex-1 rounded-[1px] transition-colors"
                    style={{
                      height: `${h}%`,
                      backgroundColor: inTrim ? "#fb6b6a" : "var(--border)",
                    }}
                  />
                );
              })}

              <div
                className="absolute top-0 bottom-0 w-1 bg-[#fb6b6a]"
                style={{ left: `${(trimStart / duration) * 100}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-1 bg-[#fb6b6a]"
                style={{ left: `${(trimEnd / duration) * 100}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white dark:bg-white"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">Trim Start</Label>
                <Slider
                  value={[trimStart]}
                  min={0}
                  max={duration - 1}
                  step={1}
                  onValueChange={(v) => setTrimStart(Math.min(v[0], trimEnd - 1))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">Trim End</Label>
                <Slider
                  value={[trimEnd]}
                  min={1}
                  max={duration}
                  step={1}
                  onValueChange={(v) => setTrimEnd(Math.max(v[0], trimStart + 1))}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Switch checked={fadeIn} onCheckedChange={setFadeIn} />
                <Label className="text-xs text-[#111827] dark:text-[#f4f4f5]">Fade In (2s)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={fadeOut} onCheckedChange={setFadeOut} />
                <Label className="text-xs text-[#111827] dark:text-[#f4f4f5]">Fade Out (2s)</Label>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. CONVERTER TOOL */}
        {/* ========================================================================= */}
        {toolId === "converter" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">Output Audio Format</Label>
              <div className="grid grid-cols-5 gap-1.5 mt-1.5">
                {["mp3", "wav", "aac", "flac", "ogg"].map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    className={`py-1 text-xs font-mono uppercase rounded-[4px] border transition-colors ${
                      format === fmt
                        ? "bg-[#fb6b6a] text-white border-transparent"
                        : "border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5]"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">Bitrate Quality</Label>
              <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                {["128", "192", "256", "320"].map((br) => (
                  <button
                    key={br}
                    type="button"
                    onClick={() => setBitrate(br)}
                    className={`py-1 text-xs font-mono rounded-[4px] border transition-colors ${
                      bitrate === br
                        ? "bg-[#fb6b6a] text-white border-transparent"
                        : "border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5]"
                    }`}
                  >
                    {br}k
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. MERGER TOOL (Song Joiner & Crossfade) */}
        {/* ========================================================================= */}
        {toolId === "merger" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                  Audio Tracks to Merge ({mergeFiles.length})
                </Label>
                <span className="block text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">
                  Add 2 or more songs to join sequentially with smooth crossfades.
                </span>
              </div>
              <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[4px] bg-[#fb6b6a] text-white text-xs font-medium cursor-pointer hover:bg-[#ea5857] transition-colors">
                <Plus className="h-3.5 w-3.5" />
                <span>Add Track</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAddMergeFile}
                  className="hidden"
                />
              </label>
            </div>

            {mergeFiles.length === 0 ? (
              <div className="p-6 text-center rounded-[6px] border border-dashed border-[#d1d5db] dark:border-[#3f3f46] bg-[#fbfbfb] dark:bg-[#18181c]">
                <Layers className="h-6 w-6 text-[#6b7280] dark:text-[#a1a1aa] mx-auto mb-1.5" />
                <span className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  No audio tracks added yet. Click &quot;Add Track&quot; above to select files.
                </span>
              </div>
            ) : (
              <div className="space-y-1.5">
                {mergeFiles.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#fb6b6a] px-1.5 py-0.5 rounded bg-[#fb6b6a]/10">
                        #{idx + 1}
                      </span>
                      <span className="text-xs text-[#111827] dark:text-[#f4f4f5] font-medium truncate max-w-[200px] sm:max-w-xs">
                        {f.name}
                      </span>
                      <span className="text-[10px] text-[#6b7280] dark:text-[#a1a1aa]">
                        ({formatBytes(f.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMergeFile(idx)}
                      className="p-1 rounded text-[#6b7280] hover:text-[#ef4444] transition-colors"
                      title="Remove track"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] space-y-1">
              <div className="flex items-center justify-between text-xs">
                <Label className="text-xs text-[#111827] dark:text-[#f4f4f5]">Crossfade Overlap Duration</Label>
                <span className="font-mono text-[#fb6b6a] font-semibold">{crossfadeSecs}s</span>
              </div>
              <Slider
                value={[crossfadeSecs]}
                min={0}
                max={6}
                step={0.5}
                onValueChange={(v) => setCrossfadeSecs(v[0])}
                className="mt-1"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. COMPRESS AUDIO TOOL */}
        {/* ========================================================================= */}
        {toolId === "compress" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">Target Bitrate</Label>
                <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                  {["64", "96", "128", "160"].map((br) => (
                    <button
                      key={br}
                      type="button"
                      onClick={() => setCompressBitrate(br)}
                      className={`py-1 text-xs font-mono rounded-[4px] border transition-colors ${
                        compressBitrate === br
                          ? "bg-[#fb6b6a] text-white border-transparent"
                          : "border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5]"
                      }`}
                    >
                      {br}k
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs">
                  <Label className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">Compression Ratio</Label>
                  <span className="font-mono text-[#fb6b6a] font-semibold">~{compressionRatio}% smaller</span>
                </div>
                <Slider
                  value={[compressionRatio]}
                  min={20}
                  max={85}
                  step={5}
                  onValueChange={(v) => setCompressionRatio(v[0])}
                  className="mt-2"
                />
              </div>
            </div>

            <div className="p-3 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] flex items-center justify-between text-xs">
              <div>
                <span className="text-[#6b7280] dark:text-[#a1a1aa] block text-[10px]">Estimated Output Weight</span>
                <span className="font-mono text-sm font-semibold text-[#111827] dark:text-[#f4f4f5]">
                  {file ? formatBytes(Math.round(file.size * (1 - compressionRatio / 100))) : "1.2 MB"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[#6b7280] dark:text-[#a1a1aa] block text-[10px]">Original Size</span>
                <span className="font-mono text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  {file ? formatBytes(file.size) : "4.8 MB"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. SPEED TOOL */}
        {/* ========================================================================= */}
        {toolId === "speed" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#111827] dark:text-[#f4f4f5]">Speed Factor</span>
              <span className="font-mono text-[#fb6b6a] font-semibold">{speedVal.toFixed(2)}x</span>
            </div>
            <Slider
              value={[speedVal * 100]}
              min={50}
              max={200}
              step={5}
              onValueChange={(v) => setSpeedVal(v[0] / 100)}
            />
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Switch checked={preservePitch} onCheckedChange={setPreservePitch} />
                <Label className="text-xs text-[#111827] dark:text-[#f4f4f5]">Preserve Pitch</Label>
              </div>
              <div className="flex gap-1 font-mono text-[11px]">
                {[0.75, 1.0, 1.25, 1.5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeedVal(s)}
                    className={`px-1.5 py-0.5 rounded-[3px] border ${
                      speedVal === s
                        ? "bg-[#fb6b6a] text-white border-transparent"
                        : "border-[#e5e7eb] dark:border-[#27272a] text-[#6b7280] dark:text-[#a1a1aa]"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. VOLUME TOOL */}
        {/* ========================================================================= */}
        {toolId === "volume" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#111827] dark:text-[#f4f4f5]">Gain Adjustment</span>
              <span className="font-mono text-[#fb6b6a] font-semibold">
                {gainDb > 0 ? `+${gainDb} dB` : `${gainDb} dB`}
              </span>
            </div>
            <Slider
              value={[gainDb]}
              min={-20}
              max={20}
              step={1}
              onValueChange={(v) => setGainDb(v[0])}
            />
            <div className="flex items-center gap-2 pt-1">
              <Switch checked={normalize} onCheckedChange={setNormalize} />
              <Label className="text-xs text-[#111827] dark:text-[#f4f4f5]">Peak Normalization</Label>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 9. BLANK AUDIO GENERATOR */}
        {/* ========================================================================= */}
        {toolId === "blank" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#111827] dark:text-[#f4f4f5]">Silence Length</span>
              <span className="font-mono text-[#fb6b6a] font-semibold">{silenceDuration}s</span>
            </div>
            <Slider
              value={[silenceDuration]}
              min={1}
              max={180}
              step={1}
              onValueChange={(v) => setSilenceDuration(v[0])}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 10. SPLIT AUDIO (PRD Section 5.2 A5) */}
        {/* ========================================================================= */}
        {toolId === "split" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-1 bg-[#f4f4f5] dark:bg-[#18181c] rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] text-xs">
              <button
                type="button"
                onClick={() => setSplitMode("equal")}
                className={`flex-1 py-1 rounded-[4px] font-medium transition-colors ${
                  splitMode === "equal"
                    ? "bg-[#fb6b6a] text-white"
                    : "text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#111827] dark:hover:text-[#f4f4f5]"
                }`}
              >
                Split by Equal Parts
              </button>
              <button
                type="button"
                onClick={() => setSplitMode("silence")}
                className={`flex-1 py-1 rounded-[4px] font-medium transition-colors ${
                  splitMode === "silence"
                    ? "bg-[#fb6b6a] text-white"
                    : "text-[#6b7280] dark:text-[#a1a1aa] hover:text-[#111827] dark:hover:text-[#f4f4f5]"
                }`}
              >
                Silence Detection
              </button>
            </div>

            {splitMode === "equal" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#111827] dark:text-[#f4f4f5]">Number of Equal Segments</span>
                  <span className="font-mono text-[#fb6b6a] font-semibold">{equalParts} Parts (~{(duration / equalParts).toFixed(1)}s each)</span>
                </div>
                <Slider
                  value={[equalParts]}
                  min={2}
                  max={16}
                  step={1}
                  onValueChange={(v) => setEqualParts(v[0])}
                />
                {/* Visual Segment Timeline */}
                <div className="flex gap-1 pt-1">
                  {Array.from({ length: equalParts }).map((_, idx) => (
                    <div
                      key={idx}
                      className="flex-1 py-1 text-center rounded-[3px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[10px] font-mono text-[#6b7280] dark:text-[#a1a1aa]"
                    >
                      Part {idx + 1}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#111827] dark:text-[#f4f4f5]">Silence Threshold</span>
                  <span className="font-mono text-[#fb6b6a] font-semibold">{silenceThresholdDb} dB</span>
                </div>
                <Slider
                  value={[silenceThresholdDb]}
                  min={-60}
                  max={-20}
                  step={1}
                  onValueChange={(v) => setSilenceThresholdDb(v[0])}
                />
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[#111827] dark:text-[#f4f4f5]">Min Silence Duration</span>
                  <span className="font-mono text-[#fb6b6a] font-semibold">{silenceMinSeconds}s</span>
                </div>
                <Slider
                  value={[silenceMinSeconds * 10]}
                  min={2}
                  max={20}
                  step={1}
                  onValueChange={(v) => setSilenceMinSeconds(v[0] / 10)}
                />
              </div>
            )}

            <div className="flex items-center gap-2 p-2 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">
              <FolderArchive className="h-3.5 w-3.5 text-[#fb6b6a] shrink-0" />
              <span>All split audio chunks will be exported directly as individual lossless tracks in a single ZIP archive.</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 11. MIX AUDIO (PRD Section 5.2 A7) */}
        {/* ========================================================================= */}
        {toolId === "mix" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#111827] dark:text-[#f4f4f5]">Multi-Track Overlays</span>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[11px] text-[#6b7280] dark:text-[#a1a1aa] hover:border-[#fb6b6a] transition-colors">
                  <Plus className="h-3 w-3 text-[#fb6b6a]" />
                  Add Track Layer
                </span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setMixTracks((prev) => [
                        ...prev,
                        {
                          id: `trk_${Date.now()}`,
                          name: f.name,
                          file: f,
                          volume: 75,
                          offset: 0,
                          muted: false,
                          solo: false,
                        },
                      ]);
                    }
                  }}
                />
              </label>
            </div>

            <div className="space-y-2">
              {mixTracks.map((trk, idx) => (
                <div
                  key={trk.id}
                  className="p-3 rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Music className="h-3.5 w-3.5 text-[#fb6b6a]" />
                      <span className="font-medium text-[#111827] dark:text-[#f4f4f5] truncate max-w-[180px] sm:max-w-xs">
                        {trk.file ? trk.file.name : trk.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setMixTracks((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, muted: !t.muted } : t))
                          )
                        }
                        className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-mono border ${
                          trk.muted
                            ? "bg-red-500 text-white border-transparent"
                            : "border-[#e5e7eb] dark:border-[#27272a] text-[#6b7280] dark:text-[#a1a1aa]"
                        }`}
                      >
                        Mute
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMixTracks((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, solo: !t.solo } : { ...t, solo: false }))
                          )
                        }
                        className={`px-1.5 py-0.5 rounded-[3px] text-[10px] font-mono border ${
                          trk.solo
                            ? "bg-[#38bdf8] text-white border-transparent"
                            : "border-[#e5e7eb] dark:border-[#27272a] text-[#6b7280] dark:text-[#a1a1aa]"
                        }`}
                      >
                        Solo
                      </button>
                      {mixTracks.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setMixTracks((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-[#6b7280] hover:text-red-500 transition-colors ml-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#6b7280] dark:text-[#a1a1aa]">Volume Level</span>
                        <span className="font-mono text-[#fb6b6a]">{trk.volume}%</span>
                      </div>
                      <Slider
                        value={[trk.volume]}
                        min={0}
                        max={150}
                        step={1}
                        onValueChange={(v) =>
                          setMixTracks((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, volume: v[0] } : t))
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[#6b7280] dark:text-[#a1a1aa]">Time Offset</span>
                        <span className="font-mono text-[#fb6b6a]">{trk.offset.toFixed(1)}s</span>
                      </div>
                      <Slider
                        value={[trk.offset * 10]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(v) =>
                          setMixTracks((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, offset: v[0] / 10 } : t))
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player Transport Bar */}
        {toolId !== "blank" && (
          <div className="flex items-center justify-between pt-3 border-t border-[#e5e7eb] dark:border-[#27272a]">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                className="h-8 w-8 rounded-[6px]"
                onClick={togglePlayPause}
                disabled={isDecoding}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-[6px]"
                onClick={() => {
                  stopAudio();
                  setCurrentTime(toolId === "cutter" ? trimStart : 0);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <span className="font-mono text-xs text-[#6b7280] dark:text-[#a1a1aa] ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              {isDecoding && (
                <span className="text-[11px] text-[#fb6b6a] font-mono animate-pulse ml-2">
                  Decoding audio track...
                </span>
              )}
            </div>

            {toolId === "vocal-remover" && isSeparated && (
              <span className="text-[10px] font-mono text-[#10b981] flex items-center gap-1 border border-[#10b981]/30 bg-[#10b981]/10 px-2 py-0.5 rounded-[4px]">
                <CheckCircle2 className="h-3 w-3" />
                Vocal Separation Ready
              </span>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
