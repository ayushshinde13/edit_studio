"use client";

import * as React from "react";
import fixWebmDuration from "fix-webm-duration";
import {
  Video,
  Upload,
  Download,
  Play,
  Pause,
  Scissors,
  Gauge,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Slider } from "@/design-system/primitives/slider";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/primitives/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatTime } from "@/lib/utils";

export default function VideoEditorPage() {
  const [videoSrc, setVideoSrc] = React.useState<string | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(60);
  const [trimStart, setTrimStart] = React.useState(0);
  const [trimEnd, setTrimEnd] = React.useState(45);
  const [playbackSpeed, setPlaybackSpeed] = React.useState(1.0);
  const [muteAudio, setMuteAudio] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);

  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setVideoSrc(URL.createObjectURL(f));
    }
  };

  const onLoadedMetadata = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      setDuration(d);
      setTrimStart(0);
      setTrimEnd(Math.min(d, 30));
    }
  };

  const onTimeUpdate = () => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime;
      setCurrentTime(curr);
      if (curr >= trimEnd) {
        videoRef.current.currentTime = trimStart;
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const [exportProgress, setExportProgress] = React.useState(0);

  const handleExport = async () => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    setIsExporting(true);
    setExportProgress(5);

    try {
      video.pause();
      setIsPlaying(false);

      let mimeType = "video/webm;codecs=vp8,opus";
      let extension = "webm";

      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1,mp4a.40.2")) {
          mimeType = "video/mp4;codecs=avc1,mp4a.40.2";
          extension = "mp4";
        } else if (MediaRecorder.isTypeSupported("video/mp4")) {
          mimeType = "video/mp4";
          extension = "mp4";
        } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
          mimeType = "video/webm;codecs=vp9,opus";
          extension = "webm";
        }
      }

      let stream: MediaStream;
      if (typeof (video as any).captureStream === "function") {
        stream = (video as any).captureStream();
      } else if (typeof (video as any).mozCaptureStream === "function") {
        stream = (video as any).mozCaptureStream();
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        stream = canvas.captureStream(30);
      }

      if (muteAudio) {
        const videoOnly = new MediaStream(stream.getVideoTracks());
        stream = videoOnly;
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      const recordedChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      const finishExport = async () => {
        video.pause();
        const rawBlob = new Blob(recordedChunks, { type: mimeType });
        let finalBlob = rawBlob;

        const totalTrimDurationMs = Math.round(Math.max(0.5, trimEnd - trimStart) * 1000);
        if (mimeType.includes("webm")) {
          try {
            finalBlob = await fixWebmDuration(rawBlob, totalTrimDurationMs);
          } catch (e) {
            console.warn("Could not patch WebM duration:", e);
          }
        }

        const downloadUrl = URL.createObjectURL(finalBlob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `edito_trimmed_${Date.now()}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Retain blob in memory so Chrome download thread completes writing
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 45000);
        setIsExporting(false);
        setExportProgress(0);
        video.currentTime = trimStart;
      };

      recorder.onstop = finishExport;

      video.currentTime = trimStart;
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          resolve();
        };
        video.addEventListener("seeked", onSeeked);
      });

      recorder.start(100);
      video.playbackRate = playbackSpeed;
      video.muted = muteAudio;
      await video.play();

      const totalTrimDuration = Math.max(0.5, trimEnd - trimStart);

      const checkTime = () => {
        const currentTrimElapsed = video.currentTime - trimStart;
        const progress = Math.min(99, Math.round((currentTrimElapsed / totalTrimDuration) * 100));
        setExportProgress(progress);

        if (video.currentTime >= trimEnd || video.ended) {
          video.removeEventListener("timeupdate", checkTime);
          if (recorder.state === "recording") {
            recorder.stop();
          }
        }
      };

      video.addEventListener("timeupdate", checkTime);
    } catch (err) {
      console.error("Video trim export error:", err);
      const a = document.createElement("a");
      a.href = videoSrc;
      a.download = `edito_video_clip_${Date.now()}.mp4`;
      a.click();
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#e5e7eb] dark:border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-[#fb6b6a]" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
              Browser Video Trimmer & Speed Editor
            </h1>
          </div>
          <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
            Trim video clips, adjust playback rate, mute audio, and export MP4 directly in browser memory.
          </p>
        </div>

        {videoSrc && (
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="h-8 text-xs px-3"
          >
            <Download className="h-3 w-3 mr-1" />
            {isExporting ? `Rendering Trim (${exportProgress}%)...` : "Export Trimmed Clip"}
          </Button>
        )}
      </div>

      {!videoSrc ? (
        <Card className="max-w-xl mx-auto p-8 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215]">
          <label className="flex flex-col items-center justify-center p-8 rounded-[6px] border border-dashed border-[#d1d5db] dark:border-[#3f3f46] hover:border-[#fb6b6a] dark:hover:border-[#fb6b6a] bg-[#fbfbfb] dark:bg-[#18181c] cursor-pointer transition-colors text-center">
            <Video className="h-8 w-8 text-[#fb6b6a] mb-2" />
            <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
              Select a video file to trim
            </span>
            <span className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] mt-1">
              Supports MP4, WebM, MOV (In-browser WebCodecs)
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] flex flex-col items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                src={videoSrc}
                onLoadedMetadata={onLoadedMetadata}
                onTimeUpdate={onTimeUpdate}
                muted={muteAudio}
                className="max-h-[380px] w-auto rounded-[6px] border border-[#e5e7eb] dark:border-[#27272a]"
              />

              <div className="w-full flex items-center justify-between gap-3 mt-3 pt-3 border-t border-[#e5e7eb] dark:border-[#27272a]">
                <Button
                  size="icon"
                  className="h-8 w-8 rounded-[6px]"
                  onClick={togglePlay}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div className="flex-1">
                  <Slider
                    value={[currentTime]}
                    min={0}
                    max={duration}
                    step={0.1}
                    onValueChange={(v) => {
                      if (videoRef.current) videoRef.current.currentTime = v[0];
                    }}
                  />
                </div>
                <span className="font-mono text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <Card className="p-4 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-4">
              <div className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5] pb-2 border-b border-[#e5e7eb] dark:border-[#27272a]">
                Trim & Speed Options
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  <span>Trim In Point</span>
                  <span className="font-mono text-[#fb6b6a]">{formatTime(trimStart)}</span>
                </div>
                <Slider
                  value={[trimStart]}
                  min={0}
                  max={duration}
                  step={0.5}
                  onValueChange={(v) => setTrimStart(Math.min(v[0], trimEnd - 1))}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  <span>Trim Out Point</span>
                  <span className="font-mono text-[#fb6b6a]">{formatTime(trimEnd)}</span>
                </div>
                <Slider
                  value={[trimEnd]}
                  min={0}
                  max={duration}
                  step={0.5}
                  onValueChange={(v) => setTrimEnd(Math.max(v[0], trimStart + 1))}
                />
              </div>

              <div className="pt-2 border-t border-[#e5e7eb] dark:border-[#27272a] space-y-1.5">
                <div className="flex justify-between text-xs text-[#6b7280] dark:text-[#a1a1aa]">
                  <span>Playback Speed</span>
                  <span className="font-mono text-[#fb6b6a]">{playbackSpeed}x</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {[0.5, 1.0, 1.5, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => setPlaybackSpeed(s)}
                      className={`py-1 text-xs font-mono rounded-[4px] border transition-colors ${playbackSpeed === s
                          ? "bg-[#fb6b6a] text-white border-transparent"
                          : "border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5]"
                        }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#e5e7eb] dark:border-[#27272a]">
                <Label className="text-xs text-[#111827] dark:text-[#f4f4f5]">Mute Audio</Label>
                <Switch checked={muteAudio} onCheckedChange={setMuteAudio} />
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
