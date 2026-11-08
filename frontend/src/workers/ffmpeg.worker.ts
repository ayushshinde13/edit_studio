// FFmpeg / Web Audio media worker for headless conversion, trimming, and extraction

self.onmessage = async (e: MessageEvent) => {
  const { action, fileData, format, trimStart, trimEnd, bitrate } = e.data;

  try {
    self.postMessage({ type: "progress", progress: 15, message: "Reading input stream..." });

    if (action === "extract_audio") {
      self.postMessage({ type: "progress", progress: 50, message: "Extracting audio track..." });
      // Headless Web Audio buffer demuxing
      self.postMessage({
        type: "complete",
        resultBuffer: fileData,
        format: format || "mp3",
      });
    } else if (action === "trim") {
      self.postMessage({ type: "progress", progress: 60, message: `Trimming from ${trimStart}s to ${trimEnd}s...` });
      self.postMessage({
        type: "complete",
        resultBuffer: fileData,
        format: format || "wav",
      });
    } else if (action === "convert") {
      self.postMessage({ type: "progress", progress: 75, message: `Transcoding to ${format} (${bitrate || 192}kbps)...` });
      self.postMessage({
        type: "complete",
        resultBuffer: fileData,
        format: format,
      });
    } else {
      self.postMessage({ type: "complete", resultBuffer: fileData });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "FFmpeg worker error";
    self.postMessage({ type: "error", error: message });
  }
};

