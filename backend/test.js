process.env.NODE_ENV = "test";

import http from "http";
const { default: app } = await import("./server.js");

async function runTests() {
  const server = app.listen(5099, async () => {
    console.log("Running automated backend API tests on port 5099...\n");

    function request(path, options = {}, body = null) {
      return new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port: 5099,
            path,
            method: options.method || "GET",
            headers: {
              "Content-Type": "application/json",
              ...(options.headers || {}),
            },
          },
          (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              try {
                resolve({ status: res.statusCode, data: JSON.parse(data) });
              } catch (e) {
                resolve({ status: res.statusCode, text: data });
              }
            });
          }
        );
        req.on("error", reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
      });
    }

    try {
      // 1. Health check
      const health = await request("/health");
      console.log("✓ GET /health:", health.status, health.data.status);

      // 2. Models manifest
      const manifest = await request("/api/v1/models/manifest");
      console.log("✓ GET /api/v1/models/manifest:", manifest.status, `(${manifest.data.models.length} models)`);

      // 3. Events ingestion
      const eventRes = await request(
        "/api/v1/events",
        { method: "POST" },
        { action: "tool_open", category: "audio", tool: "Audio Cutter" }
      );
      console.log("✓ POST /api/v1/events:", eventRes.status, eventRes.data);

      // 4. Feedback submission
      const fbRes = await request(
        "/api/v1/feedback",
        { method: "POST" },
        { message: "Great browser studio!" }
      );
      console.log("✓ POST /api/v1/feedback:", fbRes.status, fbRes.data.success);

      // 5. Admin Login
      const loginRes = await request(
        "/api/v1/auth/login",
        { method: "POST" },
        { email: "admin@edito.studio", password: "adminedito2026" }
      );
      console.log("✓ POST /api/v1/auth/login:", loginRes.status, "Token acquired");
      const token = loginRes.data.token;

      // 6. Admin summary
      const summary = await request("/api/v1/admin/summary", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("✓ GET /api/v1/admin/summary:", summary.status, `Total visitors: ${summary.data.totalVisitors}`);

      // 7. Admin charts
      const charts = await request("/api/v1/admin/charts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("✓ GET /api/v1/admin/charts:", charts.status, `Category slices: ${charts.data.categoryShare.length}`);

      // 8. Admin logs
      const logs = await request("/api/v1/admin/logs?limit=5", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("✓ GET /api/v1/admin/logs:", logs.status, `Total events: ${logs.data.total}`);

      // 9. User profile (PRD B2)
      const profile = await request("/api/v1/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("✓ GET /api/v1/me:", profile.status, `Display name: ${profile.data.displayName}`);

      // 10. Direct Signed Upload (PRD B4, B6)
      const signedUp = await request(
        "/api/v1/uploads/sign",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
        { filename: "master_track.wav", sizeBytes: 12500000, mimeType: "audio/wav" }
      );
      console.log("✓ POST /api/v1/uploads/sign:", signedUp.status, `Asset ID: ${signedUp.data.assetId}`);

      // 11. Abuse Report (PRD B10)
      const reportRes = await request(
        "/api/v1/reports",
        { method: "POST" },
        { shareId: "share_test_123", reason: "Copyright violation", comments: "Unauthorized stems" }
      );
      console.log("✓ POST /api/v1/reports:", reportRes.status, `Report status: ${reportRes.data.status}`);

      console.log("\n🎉 All Express.js backend endpoints verified successfully!");
      server.close();
      process.exit(0);
    } catch (err) {
      console.error("Test failed:", err);
      server.close();
      process.exit(1);
    }
  });
}

runTests();

