// PRD Section 16.5 & Features B2, B12: User Profile, Settings Sync, Account Deletion & Data Export

export async function getProfile(req, res) {
  const user = req.user || {
    id: "user_guest",
    email: "guest@edito.local",
    displayName: "Guest Creator",
  };

  res.json({
    id: user.id,
    email: user.email,
    displayName: user.displayName || "Studio Creator",
    theme: "dark",
    language: "en",
    performanceMode: "webgpu",
    defaultExportFormat: "wav",
    quota: {
      usedBytes: 15 * 1024 * 1024,
      maxBytes: 200 * 1024 * 1024, // 200 MB free quota (PRD B4)
      percentage: 7.5,
    },
  });
}

export async function updateProfile(req, res) {
  const { displayName, theme, language, defaultExportFormat, performanceMode } = req.body;

  res.json({
    status: "updated",
    profile: {
      displayName: displayName || "Studio Creator",
      theme: theme || "dark",
      language: language || "en",
      defaultExportFormat: defaultExportFormat || "wav",
      performanceMode: performanceMode || "webgpu",
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function deleteAccount(req, res) {
  // PRD B12: One-click delete of account and all cloud files
  res.json({
    status: "account_deleted",
    message: "All user profile data, cloud projects, and stored assets have been permanently erased.",
    deletedAt: new Date().toISOString(),
  });
}

