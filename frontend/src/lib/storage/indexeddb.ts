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
    stems?: Array<{
      id: string;
      name: string;
      volume: number;
      muted: boolean;
      solo: boolean;
      color?: string;
      iconType?: string;
      waveformSeed?: number;
    }>;
    waveformPeaks?: number[];
    hasSeparated?: boolean;
    duration?: number;
    stemMode?: 2 | 4 | 5;
    bpm?: number;
    trimStart?: number;
    trimEnd?: number;
    [key: string]: any;
  };
  audioBlob?: Blob;
  audioFileName?: string;
  audioFileType?: string;
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

export const SESSION_TOKEN_KEY = "edito_session_token";
export const ACTIVE_PROJECT_KEY = "edito_active_project_id";

let dbPromise: Promise<IDBPDatabase<EditoDB>> | null = null;

function getDB(): Promise<IDBPDatabase<EditoDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only available in browser"));
  }
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

/**
 * Initializes the browser session lifecycle:
 * If the user opens the web app in a new tab/session (or after ending the previous session),
 * all old project data is automatically purged from IndexedDB to guarantee complete privacy.
 * During an active session (including page refreshes), the current active project is preserved.
 */
export async function initSessionStorage(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const existingSession = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!existingSession) {
      // Fresh launch or previous session ended: wipe all leftover projects
      await clearAllProjects();
      localStorage.removeItem("edito_last_active_project_id");
      sessionStorage.removeItem(ACTIVE_PROJECT_KEY);
      const newSessionToken = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_TOKEN_KEY, newSessionToken);
    }
  } catch (err) {
    console.warn("Session storage init notice:", err);
  }
}

/**
 * Returns the ID of the current project uploaded in this session.
 */
export function getActiveProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACTIVE_PROJECT_KEY);
}

/**
 * Saves the current project.
 * Automatically enforces Single Active Project Isolation:
 * Replaces and cleans up any other/older project from IndexedDB so ONLY the user's
 * current active project exists in storage.
 */
export async function saveProject(project: StoredProject): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction("projects", "readwrite");
    const allKeys = await tx.store.getAllKeys();

    // Delete any older project so only the current active project exists
    for (const k of allKeys) {
      if (k !== project.id) {
        await tx.store.delete(k);
      }
    }

    await tx.store.put(project);
    await tx.done;

    if (typeof window !== "undefined") {
      sessionStorage.setItem(ACTIVE_PROJECT_KEY, project.id);
      if (project.state?.toolId) {
        sessionStorage.setItem("edito_active_tool_id", project.state.toolId);
      }
    }
  } catch (err) {
    console.error("Failed to save project to IndexedDB:", err);
  }
}

export async function getProject(id: string): Promise<StoredProject | undefined> {
  try {
    const db = await getDB();
    return await db.get("projects", id);
  } catch (err) {
    console.error("Failed to get project from IndexedDB:", err);
    return undefined;
  }
}

/**
 * Lists ONLY the current project uploaded by the user in this session.
 * Other projects are never visible or accessible.
 */
export async function listProjects(): Promise<StoredProject[]> {
  try {
    if (typeof window === "undefined") return [];

    await initSessionStorage();
    const currentId = sessionStorage.getItem(ACTIVE_PROJECT_KEY);
    if (!currentId) {
      return [];
    }

    const currentProj = await getProject(currentId);
    return currentProj ? [currentProj] : [];
  } catch (err) {
    console.error("Failed to list projects from IndexedDB:", err);
    return [];
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete("projects", id);
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem(ACTIVE_PROJECT_KEY) === id) {
        sessionStorage.removeItem(ACTIVE_PROJECT_KEY);
      }
      localStorage.removeItem("edito_last_active_project_id");
    }
  } catch (err) {
    console.error("Failed to delete project from IndexedDB:", err);
  }
}

/**
 * Clears all projects from IndexedDB.
 */
export async function clearAllProjects(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear("projects");
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(ACTIVE_PROJECT_KEY);
      localStorage.removeItem("edito_last_active_project_id");
    }
  } catch (err) {
    console.error("Failed to clear projects from IndexedDB:", err);
  }
}

/**
 * End Session & Wipe All Data:
 * Clears all IndexedDB projects, session storage, and local storage tokens.
 */
export async function endSessionAndWipeData(): Promise<void> {
  await clearAllProjects();
  if (typeof window !== "undefined") {
    sessionStorage.clear();
    localStorage.removeItem("edito_last_active_project_id");
  }
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

