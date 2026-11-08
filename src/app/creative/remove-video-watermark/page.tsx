"use client";

import * as React from "react";
import Link from "next/link";
import fixWebmDuration from "fix-webm-duration";
import {
  Video,
  Upload,
  Download,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Move,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Plus,
  Trash2,
  Image as ImageIcon,
  MousePointerClick,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Slider } from "@/design-system/primitives/slider";
import { Card } from "@/design-system/primitives/card";
import { formatTime } from "@/lib/utils";
import {
  WatermarkBox,
  applyWatermarkRemovalToFrame,
} from "@/lib/video/videoWatermark";

type DragMode = "none" | "draw" | "move" | "resize-nw" | "resize-ne" | "resize-se" | "resize-sw";

export default function RemoveVideoWatermarkPage() {
  const [videoSrc, setVideoSrc] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string>("video.mp4");
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [videoDims, setVideoDims] = React.useState<{ width: number; height: number }>({
    width: 1280,
    height: 720,
  });

  // Default box (Starts in Real Clean Background Clone mode with Zero Blur)
  const [boxes, setBoxes] = React.useState<WatermarkBox[]>([
    {
      id: "box_1",
      name: "Watermark",
      x: 72,
      y: 83,
      width: 22,
      height: 11,
      mode: "clone",
      cloneDirection: "auto",
      feather: 4,
      blurIntensity: 14,
      mosaicSize: 12,
      enabled: true,
    },
  ]);
  const [selectedBoxId, setSelectedBoxId] = React.useState<string>("box_1");

  // Playback, Audio & Compare
  const [isMuted, setIsMuted] = React.useState(false);
  const [volume, setVolume] = React.useState(1.0);
  const [compareOriginal, setCompareOriginal] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [trimStart, setTrimStart] = React.useState(0);
  const [trimEnd, setTrimEnd] = React.useState(0);

  // CURSOR INTERACTION STATE (Drawing, Moving, Resizing from any corner)
  const [dragMode, setDragMode] = React.useState<DragMode>("none");
  const dragStartRef = React.useRef<{
    startXPercent: number;
    startYPercent: number;
    boxSnapshot: WatermarkBox;
  } | null>(null);

  // Export State
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportProgress, setExportProgress] = React.useState(0);
  const cancelExportRef = React.useRef(false);

  // DOM Refs
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const animFrameRef = React.useRef<number | null>(null);

  // Render Frame on Canvas
  const renderFrame = React.useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (!compareOriginal) {
      applyWatermarkRemovalToFrame(ctx, canvas.width, canvas.height, boxes);
    }
  }, [boxes, compareOriginal]);

  // Animation Loop when playing
  React.useEffect(() => {
    let active = true;

    const loop = () => {
      if (!active) return;
      if (videoRef.current && isPlaying) {
        renderFrame();
        setCurrentTime(videoRef.current.currentTime);

        if (trimEnd > 0 && videoRef.current.currentTime >= trimEnd) {
          videoRef.current.currentTime = trimStart;
        }
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, renderFrame, trimEnd, trimStart]);

  // Re-render when paused or updated
  React.useEffect(() => {
    if (!isPlaying) {
      renderFrame();
    }
  }, [renderFrame, isPlaying, currentTime, boxes, compareOriginal]);

  // Load video metadata
  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;

    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    const d = v.duration || 10;

    setVideoDims({ width: w, height: h });
    setDuration(d);
    setTrimStart(0);
    setTrimEnd(d);
    v.muted = isMuted;
    v.volume = volume;

    if (canvasRef.current) {
      canvasRef.current.width = w;
      canvasRef.current.height = h;
    }
    renderFrame();
  };

  // Sync mute & volume changes directly onto HTMLVideoElement
  React.useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.muted = isMuted;
      v.volume = volume;
    }
  }, [isMuted, volume]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setFileName(file.name);
      setIsPlaying(false);
      setCurrentTime(0);
      setIsMuted(false);
      setVolume(1.0);
    }
  };

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      try {
        v.muted = isMuted;
        v.volume = volume;
        await v.play();
        setIsPlaying(true);
      } catch (err: any) {
        // If browser blocks unmuted play on initial gesture, mute and retry
        if (err?.name === "NotAllowedError") {
          v.muted = true;
          setIsMuted(true);
          await v.play();
          setIsPlaying(true);
        }
      }
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const nextMuted = !isMuted;
    v.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && (v.volume === 0 || volume === 0)) {
      v.volume = 1.0;
      setVolume(1.0);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      v.muted = false;
      setIsMuted(false);
    } else if (newVol === 0 && !isMuted) {
      v.muted = true;
      setIsMuted(true);
    }
  };

  const handleSeek = (newTime: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = newTime;
    setCurrentTime(newTime);
    if (!isPlaying) renderFrame();
  };

  const updateSelectedBox = (patch: Partial<WatermarkBox>) => {
    setBoxes((prev) =>
      prev.map((b) => (b.id === selectedBoxId ? { ...b, ...patch } : b))
    );
  };

  const selectedBox = boxes.find((b) => b.id === selectedBoxId) || boxes[0];

  // Helper: Convert screen cursor coordinates to video stage percentage (0 to 100%)
  const getStagePercentCoords = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  // 1. Stage MouseDown: User clicks on canvas to DRAW or MOVE box with cursor
  const handleStageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Primary left button only
    const coords = getStagePercentCoords(e.clientX, e.clientY);

    dragStartRef.current = {
      startXPercent: coords.x,
      startYPercent: coords.y,
      boxSnapshot: { ...selectedBox },
    };

    setDragMode("draw");
  };

  // 2. Box MouseDown: User clicks inside box to MOVE it with cursor
  const handleBoxMouseDown = (e: React.MouseEvent<HTMLDivElement>, boxId: string) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setSelectedBoxId(boxId);

    const coords = getStagePercentCoords(e.clientX, e.clientY);
    const box = boxes.find((b) => b.id === boxId) || selectedBox;

    dragStartRef.current = {
      startXPercent: coords.x,
      startYPercent: coords.y,
      boxSnapshot: { ...box },
    };

    setDragMode("move");
  };

  // 3. Handle MouseDown: User grabs any corner handle to RESIZE with cursor
  const handleCornerHandleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    corner: "nw" | "ne" | "se" | "sw"
  ) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    const coords = getStagePercentCoords(e.clientX, e.clientY);
    dragStartRef.current = {
      startXPercent: coords.x,
      startYPercent: coords.y,
      boxSnapshot: { ...selectedBox },
    };

    setDragMode(`resize-${corner}`);
  };

  // 4. Global MouseMove & MouseUp tracking for seamless cursor control
  React.useEffect(() => {
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (dragMode === "none" || !dragStartRef.current) return;

      const coords = getStagePercentCoords(e.clientX, e.clientY);
      const start = dragStartRef.current;
      const dx = coords.x - start.startXPercent;
      const dy = coords.y - start.startYPercent;

      if (dragMode === "draw") {
        // Drawing a new box between cursor start and cursor current
        const newX = Math.min(start.startXPercent, coords.x);
        const newY = Math.min(start.startYPercent, coords.y);
        const newW = Math.max(3, Math.abs(coords.x - start.startXPercent));
        const newH = Math.max(2, Math.abs(coords.y - start.startYPercent));

        updateSelectedBox({
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
          width: Math.round(newW * 10) / 10,
          height: Math.round(newH * 10) / 10,
        });
      } else if (dragMode === "move") {
        // Moving the box with cursor
        const orig = start.boxSnapshot;
        const newX = Math.max(0, Math.min(100 - orig.width, orig.x + dx));
        const newY = Math.max(0, Math.min(100 - orig.height, orig.y + dy));

        updateSelectedBox({
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
        });
      } else if (dragMode === "resize-se") {
        // Bottom-Right Corner
        const orig = start.boxSnapshot;
        const newW = Math.max(3, Math.min(100 - orig.x, orig.width + dx));
        const newH = Math.max(2, Math.min(100 - orig.y, orig.height + dy));
        updateSelectedBox({ width: Math.round(newW * 10) / 10, height: Math.round(newH * 10) / 10 });
      } else if (dragMode === "resize-sw") {
        // Bottom-Left Corner
        const orig = start.boxSnapshot;
        const newX = Math.max(0, Math.min(orig.x + orig.width - 3, orig.x + dx));
        const newW = orig.width + (orig.x - newX);
        const newH = Math.max(2, Math.min(100 - orig.y, orig.height + dy));
        updateSelectedBox({ x: Math.round(newX * 10) / 10, width: Math.round(newW * 10) / 10, height: Math.round(newH * 10) / 10 });
      } else if (dragMode === "resize-ne") {
        // Top-Right Corner
        const orig = start.boxSnapshot;
        const newY = Math.max(0, Math.min(orig.y + orig.height - 2, orig.y + dy));
        const newH = orig.height + (orig.y - newY);
        const newW = Math.max(3, Math.min(100 - orig.x, orig.width + dx));
        updateSelectedBox({ y: Math.round(newY * 10) / 10, width: Math.round(newW * 10) / 10, height: Math.round(newH * 10) / 10 });
      } else if (dragMode === "resize-nw") {
        // Top-Left Corner
        const orig = start.boxSnapshot;
        const newX = Math.max(0, Math.min(orig.x + orig.width - 3, orig.x + dx));
        const newW = orig.width + (orig.x - newX);
        const newY = Math.max(0, Math.min(orig.y + orig.height - 2, orig.y + dy));
        const newH = orig.height + (orig.y - newY);
        updateSelectedBox({
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10,
          width: Math.round(newW * 10) / 10,
          height: Math.round(newH * 10) / 10,
        });
      }
    };

    const handleWindowMouseUp = (e: MouseEvent) => {
      if (dragMode === "draw" && dragStartRef.current) {
        const coords = getStagePercentCoords(e.clientX, e.clientY);
        const dist = Math.hypot(
          coords.x - dragStartRef.current.startXPercent,
          coords.y - dragStartRef.current.startYPercent
        );

        // If the user just tapped/clicked a spot without dragging, center the box right there!
        if (dist < 1.8) {
          const w = selectedBox.width;
          const h = selectedBox.height;
          const newX = Math.max(0, Math.min(100 - w, coords.x - w / 2));
          const newY = Math.max(0, Math.min(100 - h, coords.y - h / 2));
          updateSelectedBox({
            x: Math.round(newX * 10) / 10,
            y: Math.round(newY * 10) / 10,
          });
        }
      }

      setDragMode("none");
      dragStartRef.current = null;
    };

    if (dragMode !== "none") {
      window.addEventListener("mousemove", handleWindowMouseMove);
      window.addEventListener("mouseup", handleWindowMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [dragMode, selectedBox]);

  // Instant Corner Snaps (Uses Auto-Matching Background Texture by default)
  const snapToCorner = (corner: "top-left" | "top-right" | "bottom-left" | "bottom-right") => {
    const updates: Record<string, Partial<WatermarkBox>> = {
      "top-left": { x: 3, y: 3, width: 22, height: 11, mode: "clone", cloneDirection: "auto" },
      "top-right": { x: 74, y: 3, width: 22, height: 11, mode: "clone", cloneDirection: "auto" },
      "bottom-left": { x: 3, y: 85, width: 22, height: 11, mode: "clone", cloneDirection: "auto" },
      "bottom-right": { x: 74, y: 84, width: 22, height: 11, mode: "clone", cloneDirection: "auto" },
    };
    updateSelectedBox(updates[corner]);
  };

  // Export Clean Video - 100% Complete Recording without premature cutoffs
  const handleExport = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !videoSrc) return;

    setIsExporting(true);
    setExportProgress(1);
    cancelExportRef.current = false;

    try {
      video.pause();
      setIsPlaying(false);

      const actualDuration =
        video.duration && isFinite(video.duration) && video.duration > 0
          ? video.duration
          : duration || 10;
      const exportStartTime = Math.max(0, trimStart);
      const exportEndTime =
        trimEnd > exportStartTime && trimEnd <= actualDuration
          ? trimEnd
          : actualDuration;
      const totalExportDuration = Math.max(0.5, exportEndTime - exportStartTime);

      // Ensure canvas resolution exactly matches source video resolution
      const targetW = video.videoWidth || videoDims.width || 1280;
      const targetH = video.videoHeight || videoDims.height || 720;
      canvas.width = targetW;
      canvas.height = targetH;

      // Safe seek to exportStartTime with fallback
      video.currentTime = exportStartTime;
      await new Promise<void>((res) => {
        let timer: any = null;
        const onSeeked = () => {
          clearTimeout(timer);
          video.removeEventListener("seeked", onSeeked);
          res();
        };
        timer = setTimeout(onSeeked, 800);
        video.addEventListener("seeked", onSeeked, { once: true });
      });

      renderFrame();

      // Prefer WebM with VP9/VP8 so EBML duration metadata is 100% patched and seekable
      let mimeType = "video/webm;codecs=vp9,opus";
      let ext = "webm";

      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
          mimeType = "video/webm;codecs=vp9,opus";
          ext = "webm";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
          mimeType = "video/webm;codecs=vp8,opus";
          ext = "webm";
        } else if (MediaRecorder.isTypeSupported("video/webm")) {
          mimeType = "video/webm";
          ext = "webm";
        } else if (MediaRecorder.isTypeSupported("video/mp4")) {
          mimeType = "video/mp4";
          ext = "mp4";
        }
      }

      const canvasStream = canvas.captureStream(30);

      let audioTracks: MediaStreamTrack[] = [];
      if (!isMuted) {
        try {
          const videoStream =
            typeof (video as any).captureStream === "function"
              ? (video as any).captureStream()
              : typeof (video as any).mozCaptureStream === "function"
              ? (video as any).mozCaptureStream()
              : null;
          if (videoStream) {
            audioTracks = videoStream.getAudioTracks();
          }
        } catch (e) {
          console.warn("Audio stream capture skipped:", e);
        }
      }

      const combinedTracks: MediaStreamTrack[] = [
        ...canvasStream.getVideoTracks(),
        ...audioTracks,
      ];

      const combinedStream = new MediaStream(combinedTracks);
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 8000000,
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      const finishExport = async () => {
        video.pause();
        if (chunks.length === 0) {
          setIsExporting(false);
          setExportProgress(0);
          return;
        }

        const rawBlob = new Blob(chunks, { type: mimeType });
        const totalDurationMs = Math.round(totalExportDuration * 1000);

        let finalBlob = rawBlob;
        // Inject EBML Duration into WebM header so Windows Media Player timer & seeking work 100%
        if (mimeType.includes("webm")) {
          try {
            finalBlob = await fixWebmDuration(rawBlob, totalDurationMs);
          } catch (err) {
            console.warn("Could not patch WebM duration:", err);
          }
        }

        const url = URL.createObjectURL(finalBlob);
        const a = document.createElement("a");
        a.href = url;
        const cleanName = fileName.replace(/\.[^/.]+$/, "");
        a.download = `${cleanName}_clean_${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Retain blob URL in memory for 45s so Chrome's download manager finishes writing to disk
        setTimeout(() => URL.revokeObjectURL(url), 45000);

        setIsExporting(false);
        setExportProgress(0);
        video.currentTime = exportStartTime;
      };

      recorder.onstop = finishExport;

      recorder.start(100);
      video.muted = isMuted;
      video.playbackRate = 1.0;
      await video.play();

      const startWallTime = performance.now();
      let isStopping = false;

      const stopRecording = () => {
        if (isStopping) return;
        isStopping = true;
        try {
          if (recorder.state === "recording") {
            recorder.requestData();
            recorder.stop();
          }
        } catch (err) {
          console.warn("Error stopping recorder:", err);
        }
      };

      const checkExportLoop = () => {
        if (cancelExportRef.current) {
          isStopping = true;
          if (recorder.state === "recording") recorder.stop();
          video.pause();
          setIsExporting(false);
          setExportProgress(0);
          return;
        }

        renderFrame();

        const elapsed = Math.max(0, video.currentTime - exportStartTime);
        const currentProgress = (elapsed / totalExportDuration) * 100;
        setExportProgress(Math.min(99, Math.max(1, Math.round(currentProgress))));

        // Prevent premature cut-offs: must have recorded for at least 500ms before checking completion
        const wallElapsed = performance.now() - startWallTime;
        const hasStarted = wallElapsed > 500 || elapsed > 0.4;

        const isAtEnd =
          hasStarted &&
          (video.currentTime >= exportEndTime - 0.05 ||
            video.ended ||
            elapsed >= totalExportDuration - 0.05);

        if (isAtEnd) {
          stopRecording();
        } else {
          requestAnimationFrame(checkExportLoop);
        }
      };

      requestAnimationFrame(checkExportLoop);
    } catch (err) {
      console.error("Export failed:", err);
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-4 select-none">
      {/* Sleek Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e5e7eb] dark:border-[#27272a]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[6px] bg-[#fb6b6a]/10 flex items-center justify-center text-[#fb6b6a]">
            <Video className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
              Video Watermark Remover
            </h1>
            <p className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">
              Click & drag with your cursor anywhere on the video to select the watermark.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/creative/remove-watermark">
            <Button variant="ghost" size="sm" className="h-8 text-xs text-[#6b7280] hover:text-[#111827]">
              <ImageIcon className="h-3.5 w-3.5 mr-1 text-[#fb6b6a]" />
              Photo Tool
            </Button>
          </Link>
          {videoSrc && (
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="h-8 text-xs px-3.5 bg-[#fb6b6a] hover:bg-[#e05655] text-white shadow-sm font-semibold"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              {isExporting ? `${exportProgress}%` : "Export Video"}
            </Button>
          )}
        </div>
      </div>

      {!videoSrc ? (
        /* Minimal Upload Area */
        <Card className="max-w-lg mx-auto p-10 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] text-center">
          <label className="flex flex-col items-center justify-center p-8 rounded-[8px] border-2 border-dashed border-[#e5e7eb] dark:border-[#27272a] hover:border-[#fb6b6a] dark:hover:border-[#fb6b6a] cursor-pointer transition-colors">
            <div className="w-12 h-12 rounded-full bg-[#fb6b6a]/10 flex items-center justify-center text-[#fb6b6a] mb-3">
              <Upload className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold text-[#111827] dark:text-[#f4f4f5]">
              Select or Drop a Video to Erase Watermarks
            </span>
            <span className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-1">
              Supports MP4, WebM, MOV (Runs 100% privately on your device)
            </span>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </Card>
      ) : (
        /* Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Video Stage Area (7 Cols) */}
          <div className="lg:col-span-7 space-y-2.5">
            <Card className="p-3 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] flex flex-col items-center">
              {/* STAGE CONTAINER WITH DIRECT CURSOR DRAWING */}
              <div
                ref={stageRef}
                id="canvas-stage-wrapper"
                onMouseDown={handleStageMouseDown}
                className="relative inline-block overflow-hidden rounded-[6px] bg-black cursor-crosshair max-w-full max-h-[500px]"
                title="Cursor se drag karke watermark select karein"
              >
                <canvas
                  ref={canvasRef}
                  className="block max-w-full h-auto max-h-[500px] object-contain pointer-events-none"
                />

                <video
                  ref={videoRef}
                  src={videoSrc}
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={() => {
                    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                  }}
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 1,
                    height: 1,
                    opacity: 0,
                    pointerEvents: "none",
                    zIndex: -1,
                  }}
                />

                {/* CURSOR-DRIVEN SELECTION BOX (With 4 Corner Handles) */}
                {!compareOriginal &&
                  boxes.map((box) => {
                    if (!box.enabled) return null;
                    const isSelected = box.id === selectedBoxId;

                    return (
                      <div
                        key={box.id}
                        onMouseDown={(e) => handleBoxMouseDown(e, box.id)}
                        className={`absolute select-none border-2 border-[#fb6b6a] bg-[rgba(251,107,106,0.08)] shadow-[0_0_0_1.5px_rgba(255,255,255,0.9),0_2px_10px_rgba(0,0,0,0.6)] ${
                          dragMode === "move" ? "cursor-grabbing" : "cursor-move"
                        }`}
                        style={{
                          left: `${box.x}%`,
                          top: `${box.y}%`,
                          width: `${box.width}%`,
                          height: `${box.height}%`,
                        }}
                      >
                        {/* Center Move Indicator (Fades out when not hovering) */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40 hover:opacity-100 text-white drop-shadow">
                          <Move className="h-3.5 w-3.5 text-white" />
                        </div>

                        {/* 4 CORNER RESIZE HANDLES (Generous, Easy to Grab) */}
                        {isSelected && (
                          <>
                            {/* Top-Left */}
                            <div
                              onMouseDown={(e) => handleCornerHandleMouseDown(e, "nw")}
                              className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-[#fb6b6a] rounded-full cursor-nwse-resize shadow-[0_1px_4px_rgba(0,0,0,0.6)] hover:scale-125 transition-transform z-10"
                            />
                            {/* Top-Right */}
                            <div
                              onMouseDown={(e) => handleCornerHandleMouseDown(e, "ne")}
                              className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-[#fb6b6a] rounded-full cursor-nesw-resize shadow-[0_1px_4px_rgba(0,0,0,0.6)] hover:scale-125 transition-transform z-10"
                            />
                            {/* Bottom-Left */}
                            <div
                              onMouseDown={(e) => handleCornerHandleMouseDown(e, "sw")}
                              className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-[#fb6b6a] rounded-full cursor-nesw-resize shadow-[0_1px_4px_rgba(0,0,0,0.6)] hover:scale-125 transition-transform z-10"
                            />
                            {/* Bottom-Right */}
                            <div
                              onMouseDown={(e) => handleCornerHandleMouseDown(e, "se")}
                              className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-[#fb6b6a] rounded-full cursor-nwse-resize shadow-[0_1px_4px_rgba(0,0,0,0.6)] hover:scale-125 transition-transform z-10"
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Cursor Help Hint */}
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#6b7280] dark:text-[#a1a1aa]">
                <MousePointerClick className="h-3.5 w-3.5 text-[#fb6b6a]" />
                <span>
                  Cursor se video par <strong>click karke drag</strong> karein, ya box ke <strong>4 corner dots</strong> se resize karein.
                </span>
              </div>

              {/* Minimal Player Transport Bar */}
              <div className="w-full mt-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={togglePlay}
                    className="h-7 w-7 p-0 shrink-0"
                  >
                    {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current ml-0.5" />}
                  </Button>

                  <span className="text-[10px] font-mono text-[#6b7280] min-w-[34px]">
                    {formatTime(currentTime)}
                  </span>

                  <Slider
                    value={[currentTime]}
                    min={0}
                    max={duration || 10}
                    step={0.1}
                    onValueChange={(v) => handleSeek(v[0])}
                    className="flex-1"
                  />

                  <span className="text-[10px] font-mono text-[#6b7280] min-w-[34px] text-right">
                    {formatTime(duration)}
                  </span>

                  {/* Sound & Volume Controls */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={toggleMute}
                      className="h-7 w-7 p-0 text-[#6b7280] hover:text-[#111827] dark:hover:text-[#f4f4f5]"
                      title={isMuted || volume === 0 ? "Unmute audio" : "Mute audio"}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="h-3.5 w-3.5 text-red-500" />
                      ) : (
                        <Volume2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <div className="w-14 hidden sm:block">
                      <Slider
                        value={[isMuted ? 0 : volume]}
                        min={0}
                        max={1}
                        step={0.05}
                        onValueChange={(val) => handleVolumeChange(val[0])}
                        className="w-14"
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={compareOriginal ? "default" : "outline"}
                    onMouseDown={() => setCompareOriginal(true)}
                    onMouseUp={() => setCompareOriginal(false)}
                    onTouchStart={() => setCompareOriginal(true)}
                    onTouchEnd={() => setCompareOriginal(false)}
                    className={`h-7 text-[10px] px-2 ${compareOriginal ? "bg-[#fb6b6a] text-white" : ""}`}
                  >
                    {compareOriginal ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                    Compare
                  </Button>
                </div>
              </div>
            </Card>

            {/* Exporting Progress */}
            {isExporting && (
              <Card className="p-3 border-[#fb6b6a]/40 bg-[#fff5f5] dark:bg-[#201111] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#fb6b6a] animate-spin" />
                    Erasing watermark ({exportProgress}%)...
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      cancelExportRef.current = true;
                    }}
                    className="text-[10px] text-red-500 underline"
                  >
                    Cancel
                  </button>
                </div>
                <div className="w-full bg-white dark:bg-black/40 h-1.5 rounded-full overflow-hidden border border-[#e5e7eb] dark:border-[#27272a]">
                  <div
                    className="bg-[#fb6b6a] h-full transition-all duration-100"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
              </Card>
            )}
          </div>

          {/* Minimal Control Panel (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-4">
              {/* Quick Corner Snaps */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] flex items-center justify-between">
                  <span>Quick Corner Snaps</span>
                  <span className="text-[10px] text-[#6b7280] font-normal">or use mouse cursor</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => snapToCorner("top-left")}
                    className="h-8 text-xs font-normal justify-start px-2.5 hover:border-[#fb6b6a]"
                  >
                    ↖ Top-Left (Logo)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => snapToCorner("top-right")}
                    className="h-8 text-xs font-normal justify-start px-2.5 hover:border-[#fb6b6a]"
                  >
                    ↗ Top-Right (CapCut)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => snapToCorner("bottom-left")}
                    className="h-8 text-xs font-normal justify-start px-2.5 hover:border-[#fb6b6a]"
                  >
                    ↙ Bottom-Left (Date)
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => snapToCorner("bottom-right")}
                    className="h-8 text-xs font-normal justify-start px-2.5 hover:border-[#fb6b6a]"
                  >
                    ↘ Bottom-Right
                  </Button>
                </div>
              </div>

              {/* Erase Method */}
              <div className="space-y-2 pt-1 border-t border-[#e5e7eb] dark:border-[#27272a]">
                <label className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] flex items-center justify-between">
                  <span>Erase Method</span>
                  <span className="text-[10px] text-[#fb6b6a] font-medium font-mono">0% BLUR • HEALED</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    size="sm"
                    variant={selectedBox.mode === "clone" ? "default" : "outline"}
                    onClick={() => updateSelectedBox({ mode: "clone", cloneDirection: selectedBox.cloneDirection || "auto" })}
                    className={`h-8 text-[11px] ${
                      selectedBox.mode === "clone"
                        ? "bg-[#fb6b6a] text-white hover:bg-[#e05655] font-bold"
                        : "text-[#6b7280]"
                    }`}
                  >
                    🎨 Clean Background
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedBox.mode === "inpaint" ? "default" : "outline"}
                    onClick={() => updateSelectedBox({ mode: "inpaint" })}
                    className={`h-8 text-[11px] ${
                      selectedBox.mode === "inpaint"
                        ? "bg-[#fb6b6a] text-white hover:bg-[#e05655]"
                        : "text-[#6b7280]"
                    }`}
                  >
                    ✨ AI Inpaint
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedBox.mode === "blur" ? "default" : "outline"}
                    onClick={() => updateSelectedBox({ mode: "blur" })}
                    className={`h-8 text-[11px] ${
                      selectedBox.mode === "blur"
                        ? "bg-[#fb6b6a] text-white hover:bg-[#e05655]"
                        : "text-[#6b7280]"
                    }`}
                  >
                    🌫️ Soft Blur
                  </Button>
                </div>

                {/* Real Clean Background Texture & Direction Picker */}
                {selectedBox.mode === "clone" && (
                  <div className="p-2 rounded-[6px] bg-[#fbfbfb] dark:bg-[#18181c] border border-[#e5e7eb] dark:border-[#27272a] space-y-1.5">
                    <span className="text-[10px] font-medium text-[#6b7280] dark:text-[#a1a1aa] block">
                      Background Source Direction (Auto Heals Color & Lighting):
                    </span>
                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { dir: "auto", label: "⚡ Auto" },
                        { dir: "above", label: "⬆️ Above" },
                        { dir: "below", label: "⬇️ Below" },
                        { dir: "left", label: "⬅️ Left" },
                        { dir: "right", label: "➡️ Right" },
                      ].map((item) => (
                        <button
                          key={item.dir}
                          type="button"
                          onClick={() => updateSelectedBox({ cloneDirection: item.dir as any })}
                          className={`text-[10px] py-1 rounded border text-center transition-colors ${
                            (selectedBox.cloneDirection || "auto") === item.dir
                              ? "border-[#fb6b6a] bg-[#fb6b6a]/15 text-[#fb6b6a] font-bold"
                              : "border-[#e5e7eb] dark:border-[#27272a] text-[#71717a] hover:border-[#fb6b6a]"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Box Dimensions */}
              <div className="space-y-2 pt-1 border-t border-[#e5e7eb] dark:border-[#27272a]">
                <div className="flex justify-between text-xs text-[#6b7280]">
                  <span>Box Width</span>
                  <span className="font-mono text-[#fb6b6a] font-bold">{selectedBox.width}%</span>
                </div>
                <Slider
                  value={[selectedBox.width]}
                  min={4}
                  max={60}
                  step={1}
                  onValueChange={(v) => updateSelectedBox({ width: v[0] })}
                />

                <div className="flex justify-between text-xs text-[#6b7280] pt-1">
                  <span>Box Height</span>
                  <span className="font-mono text-[#fb6b6a] font-bold">{selectedBox.height}%</span>
                </div>
                <Slider
                  value={[selectedBox.height]}
                  min={3}
                  max={35}
                  step={1}
                  onValueChange={(v) => updateSelectedBox({ height: v[0] })}
                />
              </div>

              {/* Optional Advanced Settings Toggle */}
              <div className="pt-1 border-t border-[#e5e7eb] dark:border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-xs text-[#6b7280] hover:text-[#111827] dark:hover:text-[#f4f4f5] py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="h-3 w-3" />
                    Advanced (Multi-Box & Softness)
                  </span>
                  {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                {showAdvanced && (
                  <div className="space-y-3 pt-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#6b7280]">Multiple Boxes:</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newBox: WatermarkBox = {
                            id: `box_${Date.now()}`,
                            name: `Watermark ${boxes.length + 1}`,
                            x: 74,
                            y: 84,
                            width: 22,
                            height: 11,
                            mode: "clone",
                            cloneDirection: "auto",
                            feather: 4,
                            blurIntensity: 14,
                            mosaicSize: 12,
                            enabled: true,
                          };
                          setBoxes([...boxes, newBox]);
                          setSelectedBoxId(newBox.id);
                        }}
                        className="h-6 text-[10px] px-2"
                      >
                        <Plus className="h-2.5 w-2.5 mr-1" />
                        Add 2nd Box (TikTok)
                      </Button>
                    </div>

                    {boxes.length > 1 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {boxes.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBoxId(b.id)}
                            className={`text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                              b.id === selectedBoxId
                                ? "border-[#fb6b6a] bg-[#fb6b6a]/10 text-[#fb6b6a] font-bold"
                                : "border-[#e5e7eb] text-[#71717a]"
                            }`}
                          >
                            <span>{b.name}</span>
                            <Trash2
                              onClick={(e) => {
                                e.stopPropagation();
                                const filtered = boxes.filter((x) => x.id !== b.id);
                                setBoxes(filtered);
                                setSelectedBoxId(filtered[0]?.id || "");
                              }}
                              className="h-2.5 w-2.5 hover:text-red-500"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-[#6b7280]">
                        <span>Border Softness (Feather)</span>
                        <span className="font-mono text-[#fb6b6a]">{selectedBox.feather}px</span>
                      </div>
                      <Slider
                        value={[selectedBox.feather]}
                        min={1}
                        max={16}
                        step={1}
                        onValueChange={(v) => updateSelectedBox({ feather: v[0] })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Big Clean Export Button */}
              <div className="pt-2">
                <Button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full h-10 text-xs font-semibold bg-[#fb6b6a] hover:bg-[#e05655] text-white shadow-sm"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  {isExporting ? `Exporting (${exportProgress}%)...` : "Export Clean Video"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
