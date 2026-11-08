import { store } from "../services/store.js";

export function getSummary(req, res) {
  const stats = store.getSummaryStats();
  res.json({
    updatedAt: new Date().toISOString(),
    ...stats,
  });
}

export function getCharts(req, res) {
  const data = store.getChartData();
  res.json({
    updatedAt: new Date().toISOString(),
    ...data,
  });
}

export function getLogs(req, res) {
  const { page, limit, category, tool, action, country, ipSearch, startDate, endDate } = req.query;

  const results = store.getEvents({
    page: parseInt(page || "1", 10),
    limit: parseInt(limit || "50", 10),
    category,
    tool,
    action,
    country,
    ipSearch,
    startDate,
    endDate,
  });

  res.json(results);
}

export function exportLogs(req, res) {
  const { category, tool, action } = req.query;
  const { items } = store.getEvents({ page: 1, limit: 5000, category, tool, action });

  const headers = "id,ts,ip_masked,country_code,category,tool,action,ok,error_type,device_class,browser\n";
  const rows = items
    .map(
      (e) =>
        `"${e.id}","${e.ts}","${e.ip_masked}","${e.country_code}","${e.category}","${e.tool}","${e.action}",${e.ok},"${e.error_type || ""}","${e.device_class}","${e.browser}"`
    )
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="edito_logs_${Date.now()}.csv"`);
  res.status(200).send(headers + rows);
}

export function getErrors(req, res) {
  const errors = store.getErrorLogs();
  const charts = store.getChartData();

  res.json({
    updatedAt: new Date().toISOString(),
    fallbackStats: charts.fallbackStats,
    groupedErrors: errors,
  });
}

export function getSettings(req, res) {
  res.json({ settings: store.adminSettings });
}

export function updateSettings(req, res) {
  const { retentionDays, excludedIpHashes, logFullIp, alertEmail } = req.body;

  if (retentionDays !== undefined) {
    store.adminSettings.retentionDays = Math.max(7, Math.min(365, parseInt(retentionDays, 10)));
  }
  if (Array.isArray(excludedIpHashes)) {
    store.adminSettings.excludedIpHashes = excludedIpHashes;
  }
  if (logFullIp !== undefined) {
    store.adminSettings.logFullIp = Boolean(logFullIp);
  }
  if (alertEmail) {
    store.adminSettings.alertEmail = String(alertEmail).trim();
  }

  store.adminSettings.updatedAt = new Date().toISOString();
  res.json({ success: true, settings: store.adminSettings });
}

export function runCleanup(req, res) {
  const { days } = req.body || {};
  const result = store.purgeOldEvents(days);
  res.json({
    success: true,
    message: `Purged ${result.deletedCount} log events older than ${days || store.adminSettings.retentionDays} days.`,
    ...result,
  });
}

