"use client";

import * as React from "react";
import {
  FileAudio,
  Upload,
  Download,
  Sparkles,
  Video,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/design-system/primitives/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/design-system/primitives/card";
import { Label } from "@/components/ui/label";
import { getAudioContext, exportAudioBlob, decodeAudioFromFile } from "@/lib/audio/audioContext";
import { formatBytes } from "@/lib/utils";

export default function VideoToAudioPage() {
  const [file, setFile] = React.useState<File | null>(null);
  const [format, setFormat] = React.useState<"mp3" | "wav">("mp3");
  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractedUrl, setExtractedUrl] = React.useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setExtractedUrl(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;
    setIsExtracting(true);

    try {
      const audioBuffer = await decodeAudioFromFile(file);
      const audioBlob = exportAudioBlob(audioBuffer, format);
      const url = URL.createObjectURL(audioBlob);
      setExtractedUrl(url);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.[^/.]+$/, "")}_extracted.${format}`;
      a.click();
    } catch (err: any) {
      console.error("Audio extraction error:", err);
      alert("Could not extract audio track. Ensure the video contains a valid audio stream.");
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 space-y-4">
      <div className="pb-4 border-b border-[#e5e7eb] dark:border-[#27272a]">
        <div className="flex items-center gap-2">
          <FileAudio className="h-5 w-5 text-[#fb6b6a]" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#f4f4f5]">
            Extract Audio from Video
          </h1>
        </div>
        <p className="text-xs text-[#6b7280] dark:text-[#a1a1aa] mt-0.5">
          Extract MP3 or lossless WAV audio tracks from MP4, WebM, and MOV with zero upload delay.
        </p>
      </div>

      <Card className="p-6 border-[#e5e7eb] dark:border-[#27272a] bg-white dark:bg-[#121215] space-y-4">
        <label className="flex flex-col items-center justify-center p-8 rounded-[6px] border border-dashed border-[#d1d5db] dark:border-[#3f3f46] hover:border-[#fb6b6a] dark:hover:border-[#fb6b6a] bg-[#fbfbfb] dark:bg-[#18181c] cursor-pointer transition-colors text-center">
          <Video className="h-8 w-8 text-[#fb6b6a] mb-2" />
          <span className="text-xs font-semibold text-[#111827] dark:text-[#f4f4f5]">
            {file ? file.name : "Select or drag a video file"}
          </span>
          <span className="text-[11px] text-[#6b7280] dark:text-[#a1a1aa] mt-1">
            {file ? `${formatBytes(file.size)} • Ready to rip audio` : "MP4, WebM, MOV, MKV"}
          </span>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        <div className="flex items-center justify-between pt-2">
          <Label className="text-xs text-[#6b7280] dark:text-[#a1a1aa]">Desired Audio Format</Label>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setFormat("mp3")}
              className={`px-3 py-1 text-xs font-mono uppercase rounded-[4px] border transition-colors ${
                format === "mp3"
                  ? "bg-[#fb6b6a] text-white border-transparent"
                  : "border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5]"
              }`}
            >
              MP3
            </button>
            <button
              type="button"
              onClick={() => setFormat("wav")}
              className={`px-3 py-1 text-xs font-mono uppercase rounded-[4px] border transition-colors ${
                format === "wav"
                  ? "bg-[#fb6b6a] text-white border-transparent"
                  : "border-[#e5e7eb] dark:border-[#27272a] bg-[#fbfbfb] dark:bg-[#18181c] text-[#111827] dark:text-[#f4f4f5]"
              }`}
            >
              WAV
            </button>
          </div>
        </div>

        <Button
          onClick={handleExtract}
          disabled={!file || isExtracting}
          className="w-full h-9 text-xs font-semibold"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          {isExtracting ? "Ripping Audio..." : "Extract Audio Track"}
        </Button>

        {extractedUrl && (
          <div className="space-y-3 pt-2 border-t border-[#e5e7eb] dark:border-[#27272a]">
            <div className="p-2.5 rounded-[4px] border border-[#10b981]/30 bg-[#10b981]/10 text-[11px] text-[#10b981] flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Audio track extracted with sound and saved to your device.</span>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-[#111827] dark:text-[#f4f4f5]">Listen to Preview:</span>
              <audio controls src={extractedUrl} className="w-full h-9 rounded" />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
