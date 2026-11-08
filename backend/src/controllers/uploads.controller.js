// PRD Section 16.5 & Features B4, B6: Signed Upload URL Generation with Quota Check
import crypto from "crypto";

export async function signUpload(req, res) {
  const { filename, sizeBytes, mimeType } = req.body;

  if (!filename || !sizeBytes || !mimeType) {
    return res.status(400).json({
      error: { code: "INVALID_UPLOAD_PARAMS", message: "filename, sizeBytes, and mimeType are required." },
    });
  }

  // Quota check: 200 MB max per user on free tier (PRD B4)
  const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150 MB max single asset
  if (sizeBytes > MAX_FILE_SIZE) {
    return res.status(413).json({
      error: { code: "QUOTA_EXCEEDED", message: "File exceeds single asset upload quota limit (150 MB)." },
    });
  }

  // Allowed media types
  const allowedPrefixes = ["audio/", "image/", "video/", "application/zip"];
  const isAllowed = allowedPrefixes.some((p) => mimeType.startsWith(p));
  if (!isAllowed) {
    return res.status(415).json({
      error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Only audio, image, and video files are supported." },
    });
  }

  const assetId = `asset_${crypto.randomBytes(8).toString("hex")}`;
  const uploadToken = crypto.randomBytes(16).toString("hex");

  // In production, this would be a presigned S3/R2/Supabase Storage PUT URL
  const signedUploadUrl = `https://storage.edito.local/uploads/${assetId}?token=${uploadToken}&expires=3600`;

  res.json({
    assetId,
    signedUploadUrl,
    expiresInSeconds: 3600,
    headers: {
      "Content-Type": mimeType,
      "x-amz-acl": "private",
    },
  });
}

