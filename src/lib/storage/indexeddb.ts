import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface StoredProject {
  id: string;
  type: "stems" | "audio_tool" | "photo" | "collage" | "video";
  title: string;
  updatedAt: number;
  sizeBytes: number;
  thumbnailDataUrl?: string;
  state: {
    pitch?: number;
    tempo?: number;
    loopA?: number;
    loopB?: number;
    chords?: Array<{ time: number; chord: string }>;
    markers?: Array<{ time: number; label: string }>;
    notes?: string;
    toolId?: string;
    settings?: Record<string, any>;
    stems?: Array<{ name: string; volume: number; muted: boolean; solo: boolean }>;
  };
  audioBlobs?: Record<string, Blob>;
  imageDataUrl?: string;
}

interface EditoDB extends DBSchema {
  projects: {
    key: string;
    value: StoredProject;
    indexes: {
      "by-updated": number;
      "by-type": string;
    };
  };
  cachedModels: {
    key: string;
    value: {
      modelId: string;
      version: string;
      data: ArrayBuffer;
      timestamp: number;
    };
  };
}

const DB_NAME = "edito_studio_db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EditoDB>> | null = null;

function getDB(): Promise<IDBPDatabase<EditoDB>> {
  if (!dbPromise) {
    dbPromise = openDB<EditoDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("projects")) {
          const projectStore = db.createObjectStore("projects", { keyPath: "id" });
          projectStore.createIndex("by-updated", "updatedAt");
          projectStore.createIndex("by-type", "type");
        }
        if (!db.objectStoreNames.contains("cachedModels")) {
          db.createObjectStore("cachedModels", { keyPath: "modelId" });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProject(project: StoredProject): Promise<void> {
  const db = await getDB();
  await db.put("projects", project);
}

export async function getProject(id: string): Promise<StoredProject | undefined> {
  const db = await getDB();
  return db.get("projects", id);
}

export async function listProjects(): Promise<StoredProject[]> {
  const db = await getDB();
  const tx = db.transaction("projects", "readonly");
  const index = tx.store.index("by-updated");
  const results = await index.getAll();
  return results.reverse(); // newest first
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("projects", id);
}

export async function clearAllProjects(): Promise<void> {
  const db = await getDB();
  await db.clear("projects");
}

export async function cacheModelBuffer(modelId: string, version: string, data: ArrayBuffer): Promise<void> {
  const db = await getDB();
  await db.put("cachedModels", {
    modelId,
    version,
    data,
    timestamp: Date.now(),
  });
}

export async function getCachedModelBuffer(modelId: string): Promise<ArrayBuffer | null> {
  const db = await getDB();
  const record = await db.get("cachedModels", modelId);
  return record ? record.data : null;
}

