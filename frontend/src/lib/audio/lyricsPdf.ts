// Dynamic jsPDF loader to prevent build breaks when jspdf is not pre-installed
async function loadJsPdf(): Promise<any> {
  if (typeof window === "undefined") return null;
  if ((window as any).jspdf?.jsPDF) return (window as any).jspdf.jsPDF;
  if ((window as any).jsPDF) return (window as any).jsPDF;

  return new Promise((resolve) => {
    const existing = document.querySelector('script[src*="jspdf"]');
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).jspdf?.jsPDF || (window as any).jsPDF || null));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.async = true;
    script.onload = () => resolve((window as any).jspdf?.jsPDF || (window as any).jsPDF || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

export interface ExportLyricsPdfOptions {
  title?: string;
  artist?: string;
  lyrics: string;
  syncedLyrics?: Array<{ time: number; text: string }>;
  includeTimestamps?: boolean;
}

/**
 * Generates and downloads a beautifully styled, high-resolution printable PDF
 * of the song lyrics with full multilingual Unicode (Devanagari/Hindi/Latin) support,
 * verse styling, and Edito branding.
 */
export async function downloadLyricsPdf({
  title = "Song Lyrics",
  artist = "",
  lyrics = "",
  syncedLyrics = [],
  includeTimestamps = false,
}: ExportLyricsPdfOptions): Promise<boolean> {
  if (typeof window === "undefined" || !lyrics || !lyrics.trim()) {
    return false;
  }

  const cleanTitle = (title || "Song Lyrics").replace(/\.[^/.]+$/, "").trim();
  const JsPdfClass = await loadJsPdf();
  const pdf = JsPdfClass
    ? new JsPdfClass({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })
    : null;

  const pageWidthMm = 210;
  const pageHeightMm = 297;

  // 2x scale for crisp printing
  const scale = 2;
  const canvasWidth = Math.round(pageWidthMm * 3.7795 * scale); // ~1587 px
  const canvasHeight = Math.round(pageHeightMm * 3.7795 * scale); // ~2245 px
  const marginX = 55 * scale;
  const marginTop = 50 * scale;
  const marginBottom = 50 * scale;
  const contentWidth = canvasWidth - marginX * 2;
  const maxContentY = canvasHeight - marginBottom - 30 * scale;

  // Parse lines to render
  let linesToRender: Array<{ text: string; isHeader?: boolean }> = [];

  if (includeTimestamps && syncedLyrics && syncedLyrics.length > 0) {
    linesToRender = syncedLyrics.map((item) => {
      const min = Math.floor(item.time / 60);
      const sec = Math.floor(item.time % 60);
      const timestamp = `[${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}]`;
      return { text: `${timestamp}  ${item.text}`, isHeader: false };
    });
  } else {
    linesToRender = lyrics.split("\n").map((line) => {
      const trimmed = line.trim();
      const isHeader = /^\[.*\]$/.test(trimmed);
      return { text: trimmed, isHeader };
    });
  }

  // Pre-split long lines to fit contentWidth
  const dummyCanvas = document.createElement("canvas");
  const dummyCtx = dummyCanvas.getContext("2d");
  if (dummyCtx) {
    dummyCtx.font = `${14 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Mangal", sans-serif`;
  }

  const formattedLines: Array<{ text: string; isHeader: boolean; isBlank: boolean }> = [];
  for (const item of linesToRender) {
    if (!item.text) {
      formattedLines.push({ text: "", isHeader: false, isBlank: true });
      continue;
    }

    if (item.isHeader) {
      formattedLines.push({ text: item.text, isHeader: true, isBlank: false });
      continue;
    }

    if (!dummyCtx) {
      formattedLines.push({ text: item.text, isHeader: false, isBlank: false });
      continue;
    }

    // Word wrap if too long
    const words = item.text.split(" ");
    let currentLine = "";

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
      const metrics = dummyCtx.measureText(testLine);
      if (metrics.width > contentWidth && currentLine) {
        formattedLines.push({ text: currentLine, isHeader: false, isBlank: false });
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      formattedLines.push({ text: currentLine, isHeader: false, isBlank: false });
    }
  }

  // Paginate lines
  const pages: Array<Array<{ text: string; isHeader: boolean; isBlank: boolean }>> = [];
  let currentPageLines: Array<{ text: string; isHeader: boolean; isBlank: boolean }> = [];

  const headerHeight = 90 * scale;
  const lineHeight = 24 * scale;
  const blankLineHeight = 14 * scale;

  let currentY = marginTop + headerHeight;

  for (const line of formattedLines) {
    const requiredH = line.isBlank ? blankLineHeight : lineHeight;
    if (currentY + requiredH > maxContentY) {
      pages.push(currentPageLines);
      currentPageLines = [line];
      currentY = marginTop + (line.isBlank ? blankLineHeight : lineHeight);
    } else {
      currentPageLines.push(line);
      currentY += requiredH;
    }
  }
  if (currentPageLines.length > 0 || pages.length === 0) {
    pages.push(currentPageLines);
  }

  const totalPages = pages.length;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    // Clean white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Page 1 Header
    if (pageIdx === 0) {
      // Top accent bar
      ctx.fillStyle = "#fb6b6a";
      ctx.fillRect(marginX, marginTop, 36 * scale, 3 * scale);

      // Edito branding label
      ctx.fillStyle = "#fb6b6a";
      ctx.font = `bold ${9 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText("EDITO STUDIO  •  OFFICIAL LYRICS SHEET", marginX + 44 * scale, marginTop + 4 * scale);

      // Title
      ctx.fillStyle = "#111827";
      ctx.font = `bold ${22 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Mangal", sans-serif`;
      ctx.fillText(cleanTitle, marginX, marginTop + 28 * scale);

      // Artist & Metadata
      ctx.fillStyle = "#6b7280";
      ctx.font = `${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
      const artistSubtitle = artist ? `Artist: ${artist}` : "Song Lyrics & Rehearsal Sheet";
      const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      ctx.fillText(`${artistSubtitle}  •  ${dateStr}`, marginX, marginTop + 46 * scale);

      // Thin divider line
      ctx.strokeStyle = "#e5e7eb";
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(marginX, marginTop + 60 * scale);
      ctx.lineTo(canvasWidth - marginX, marginTop + 60 * scale);
      ctx.stroke();

      currentY = marginTop + headerHeight;
    } else {
      // Continuation Header on Subsequent Pages
      ctx.fillStyle = "#9ca3af";
      ctx.font = `${10 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(`${cleanTitle} ${artist ? `• ${artist}` : ""} (Continued)`, marginX, marginTop + 10 * scale);

      ctx.strokeStyle = "#f3f4f6";
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(marginX, marginTop + 18 * scale);
      ctx.lineTo(canvasWidth - marginX, marginTop + 18 * scale);
      ctx.stroke();

      currentY = marginTop + 35 * scale;
    }

    // Render lyrics lines on this page
    const lines = pages[pageIdx];
    for (const item of lines) {
      if (item.isBlank) {
        currentY += blankLineHeight;
        continue;
      }

      if (item.isHeader) {
        ctx.fillStyle = "#fb6b6a";
        ctx.font = `bold ${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillText(item.text, marginX, currentY);
        currentY += lineHeight;
        continue;
      }

      // Normal lyric text
      ctx.fillStyle = "#1f2937";
      ctx.font = `${13 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans", "Mangal", sans-serif`;
      ctx.fillText(item.text, marginX, currentY);
      currentY += lineHeight;
    }

    // Footer on every page
    const footerY = canvasHeight - 30 * scale;
    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(marginX, footerY - 14 * scale);
    ctx.lineTo(canvasWidth - marginX, footerY - 14 * scale);
    ctx.stroke();

    ctx.fillStyle = "#9ca3af";
    ctx.font = `${9 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText("Generated with Edito — Free In-Browser Music & Creative Suite", marginX, footerY);

    const pageStr = `Page ${pageIdx + 1} of ${totalPages}`;
    const pageMetrics = ctx.measureText(pageStr);
    ctx.fillText(pageStr, canvasWidth - marginX - pageMetrics.width, footerY);

    // Add page to jsPDF if available
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    if (pdf) {
      if (pageIdx > 0) {
        pdf.addPage("a4", "portrait");
      }
      pdf.addImage(imgData, "JPEG", 0, 0, pageWidthMm, pageHeightMm);
    }
  }

  // Save the PDF file
  const safeFilename = cleanTitle.replace(/[^a-zA-Z0-9\s-_]/g, "").trim() || "song_lyrics";
  if (pdf) {
    pdf.save(`${safeFilename}_lyrics.pdf`);
  } else {
    // Graceful fallback: trigger native print / download
    window.print();
  }
  return true;
}
