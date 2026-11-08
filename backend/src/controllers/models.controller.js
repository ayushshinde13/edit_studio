import { store } from "../services/store.js";

export function getManifest(req, res) {
  res.json({
    updatedAt: new Date().toISOString(),
    models: store.models,
  });
}

