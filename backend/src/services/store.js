import crypto from "crypto";

/**
 * In-Memory Database Store for Edito Express Backend
 * Implements the full data model from PRD Section 16.4 & 17.10
 */

class MemoryStore {
  constructor() {
    this.adminSettings = {
      retentionDays: 90,
      excludedIpHashes: [],
      logFullIp: false,
      alertEmail: "admin@edito.studio",
      updatedAt: new Date().toISOString(),
    };

    this.projects = new Map();
    this.shares = new Map();
    this.feedback = [];
    this.reports = [];
    this.events = [];
    this.dailyStats = [];

    this.models = [
      {
        id: "demucs-htdemucs-v4",
        name: "HTDemucs v4 (4-Stem Studio)",
        version: "4.0.0",
        url: "https://huggingface.co/models/edito/demucs-v4-quantized.onnx",
        size_bytes: 118000000,
        sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        min_browser_features: ["webgpu", "simd"],
        active: true,
      },
      {
        id: "spleeter-2stem-v1",
        name: "Spleeter 2-Stem Fast",
        version: "1.2.0",
        url: "https://huggingface.co/models/edito/spleeter-2stems.onnx",
        size_bytes: 38000000,
        sha256: "cca3914a2a1984407bc17ff989bf40702cae9652750e6403ea4995e9f8263162",
        min_browser_features: ["wasm"],
        active: true,
      },
      {
        id: "lama-inpainting-fp16",
        name: "LaMa Neural Inpainter",
        version: "2.1.0",
        url: "https://huggingface.co/models/edito/lama-fp16.onnx",
        size_bytes: 48500000,
        sha256: "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
        min_browser_features: ["webgpu", "wasm"],
        active: true,
      },
      {
        id: "u2net-bg-removal",
        name: "U2-Net Background Remover",
        version: "1.0.1",
        url: "https://huggingface.co/models/edito/u2net-portrait.onnx",
        size_bytes: 42000000,
        sha256: "d5579c46dfcc7f18207013fa5cc6b84766129d5332e01f14e062a26ec5c259a1",
        min_browser_features: ["webgpu"],
        active: true,
      },
    ];
  }

  // --- Events API ---
  addEvent(eventData) {
    // Check if IP is in exclusion list (PRD 17.7)
    if (this.adminSettings.excludedIpHashes.includes(eventData.ip_hash)) {
      return null;
    }

    const event = {
      id: `evt-${crypto.randomUUID().substring(0, 8)}`,
      ts: new Date().toISOString(),
      ...eventData,
      created_at: new Date().toISOString(),
    };

    this.events.unshift(event);
    return event;
  }

  getEvents({ page = 1, limit = 50, category, tool, action, country, ipSearch, startDate, endDate }) {
    let filtered = [...this.events];

    // Filter out excluded admin IPs
    if (this.adminSettings.excludedIpHashes.length > 0) {
      filtered = filtered.filter((e) => !this.adminSettings.excludedIpHashes.includes(e.ip_hash));
    }

    if (category && category !== "all") {
      filtered = filtered.filter((e) => e.category === category);
    }
    if (tool && tool !== "all") {
      filtered = filtered.filter((e) => e.tool === tool);
    }
    if (action && action !== "all") {
      filtered = filtered.filter((e) => e.action === action);
    }
    if (country && country !== "all") {
      filtered = filtered.filter((e) => e.country_code === country);
    }
    if (ipSearch) {
      filtered = filtered.filter((e) => e.ip_masked.includes(ipSearch) || e.ip_hash.includes(ipSearch));
    }
    if (startDate) {
      filtered = filtered.filter((e) => new Date(e.ts) >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter((e) => new Date(e.ts) <= new Date(endDate));
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return {
      items,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    };
  }

  // --- Admin Analytics Summaries ---
  getSummaryStats() {
    const totalHits = this.events.length;
    const uniqueIps = new Set(this.events.map((e) => e.ip_hash)).size;
    const processes = this.events.filter((e) => e.action === "process").length;
    const exports = this.events.filter((e) => e.action === "export" && e.ok).length;
    const errors = this.events.filter((e) => !e.ok).length;

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const activeLast24h = this.events.filter((e) => new Date(e.ts).getTime() > oneDayAgo).length;

    const exportRate = processes > 0 ? ((exports / processes) * 100).toFixed(1) : "0.0";

    return {
      totalVisitors: totalHits,
      uniqueUsers: uniqueIps,
      totalOperations: processes,
      successfulExports: exports,
      exportRatePercent: parseFloat(exportRate),
      activeLast24Hours: activeLast24h,
      totalErrors: errors,
    };
  }

  getChartData() {
    // 1. Category share
    const catCounts = { audio: 0, image: 0, video: 0 };
    for (const e of this.events) {
      if (catCounts[e.category] !== undefined) catCounts[e.category]++;
    }

    const totalCat = catCounts.audio + catCounts.image + catCounts.video;
    const categoryShare = totalCat === 0
      ? []
      : [
        { name: "Audio", value: catCounts.audio, color: "#fb6b6a" },
        { name: "Creative Image", value: catCounts.image, color: "#38bdf8" },
        { name: "Video", value: catCounts.video, color: "#a855f7" },
      ].filter((c) => c.value > 0);

    // 2. Top tools leaderboard
    const toolCounts = {};
    for (const e of this.events) {
      if (!toolCounts[e.tool]) toolCounts[e.tool] = { tool: e.tool, opens: 0, processes: 0, exports: 0 };
      if (e.action === "open") toolCounts[e.tool].opens++;
      if (e.action === "process") toolCounts[e.tool].processes++;
      if (e.action === "export" && e.ok) toolCounts[e.tool].exports++;
    }

    const topTools = Object.values(toolCounts)
      .sort((a, b) => b.processes + b.exports - (a.processes + a.exports))
      .slice(0, 6);

    // 3. Device & platform split
    const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
    for (const e of this.events) {
      if (deviceCounts[e.device_class] !== undefined) deviceCounts[e.device_class]++;
    }

    // 4. WebGPU vs WASM fallback rate
    const webGpuCount = this.events.filter((e) => e.backend_used === "webgpu").length;
    const wasmCount = this.events.filter((e) => e.backend_used === "wasm").length;
    const totalGpu = webGpuCount + wasmCount;
    const fallbackRate = totalGpu > 0 ? (wasmCount / totalGpu) * 100 : 0;

    // 5. Daily Trend Line
    const daysMap = {};
    for (let d = 6; d >= 0; d--) {
      const dayDate = new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      daysMap[dayDate] = { audio: 0, image: 0, video: 0 };
    }
    for (const e of this.events) {
      const dayKey = (e.ts || e.created_at || "").split("T")[0];
      if (daysMap[dayKey] && daysMap[dayKey][e.category] !== undefined) {
        daysMap[dayKey][e.category]++;
      }
    }
    const trendLine = Object.entries(daysMap).map(([date, counts]) => ({
      date,
      audio: counts.audio,
      image: counts.image,
      video: counts.video,
    }));

    return {
      categoryShare,
      topTools,
      trendLine,
      deviceSplit: deviceCounts,
      fallbackStats: {
        webGpuSessions: webGpuCount,
        wasmFallbackSessions: wasmCount,
        fallbackRatePercent: parseFloat(fallbackRate.toFixed(1)),
      },
    };
  }

  getErrorLogs() {
    const errorEvents = this.events.filter((e) => !e.ok);
    const grouped = {};

    for (const err of errorEvents) {
      const key = `${err.tool}_${err.error_type || "UnknownError"}`;
      if (!grouped[key]) {
        grouped[key] = {
          tool: err.tool,
          errorType: err.error_type || "UnknownError",
          count: 0,
          firstSeen: err.ts,
          lastSeen: err.ts,
          browser: err.browser,
          os: err.os,
        };
      }
      grouped[key].count++;
      grouped[key].lastSeen = err.ts;
    }

    return Object.values(grouped);
  }

  purgeOldEvents(days) {
    const cutoff = Date.now() - (days || this.adminSettings.retentionDays) * 24 * 60 * 60 * 1000;
    const initialCount = this.events.length;
    this.events = this.events.filter((e) => new Date(e.ts).getTime() >= cutoff);
    const deletedCount = initialCount - this.events.length;
    return { deletedCount, remainingCount: this.events.length };
  }

  // --- Projects API ---
  saveProject(userId, projectData) {
    const id = projectData.id || `proj-${crypto.randomUUID()}`;
    const project = {
      id,
      ownerId: userId,
      type: projectData.type || "stems",
      title: projectData.title || "Untitled Project",
      state: projectData.state || {},
      sizeBytes: projectData.sizeBytes || 0,
      createdAt: projectData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(id, project);
    return project;
  }

  getProjectsByUser(userId) {
    const userProjects = [];
    for (const proj of this.projects.values()) {
      if (proj.ownerId === userId) userProjects.push(proj);
    }
    return userProjects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  deleteProject(userId, projectId) {
    const proj = this.projects.get(projectId);
    if (!proj) return false;
    if (proj.ownerId !== userId) return false;
    return this.projects.delete(projectId);
  }

  // --- Shares API ---
  createShare(projectId, userId, { visibility = "unlisted", expiryDays = 7 }) {
    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString() : null;

    const share = {
      id: `share-${crypto.randomUUID().substring(0, 8)}`,
      token,
      projectId,
      ownerId: userId,
      visibility,
      expiresAt,
      viewCount: 0,
      createdAt: new Date().toISOString(),
    };

    this.shares.set(token, share);
    return share;
  }

  getShare(token) {
    const share = this.shares.get(token);
    if (!share) return null;
    if (share.expiresAt && new Date(share.expiresAt).getTime() < Date.now()) {
      return null;
    }
    share.viewCount++;
    return share;
  }

  revokeShare(userId, token) {
    const share = this.shares.get(token);
    if (!share) return false;
    if (share.ownerId !== userId) return false;
    return this.shares.delete(token);
  }

  // --- Feedback & Reports ---
  addFeedback(feedbackData) {
    const record = {
      id: `fb-${crypto.randomUUID().substring(0, 8)}`,
      createdAt: new Date().toISOString(),
      ...feedbackData,
    };
    this.feedback.unshift(record);
    return record;
  }

  addReport(reportData) {
    const record = {
      id: `rep-${crypto.randomUUID().substring(0, 8)}`,
      status: "pending",
      createdAt: new Date().toISOString(),
      ...reportData,
    };
    this.reports.unshift(record);
    return record;
  }
}

export const store = new MemoryStore();

