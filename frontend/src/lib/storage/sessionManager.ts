// Session Lifecycle & Privacy Management
// Guarantees Single-Project Session Isolation and Automatic Cleanup on Session End

export const SESSION_TOKEN_KEY = "edito_session_token";
export const ACTIVE_PROJECT_KEY = "edito_active_project_id";
export const ACTIVE_TOOL_KEY = "edito_active_tool_id";

/**
 * Initializes the browser session lifecycle:
 * If the user opens the web app in a new tab/session (or after ending the previous session),
 * all old project data is automatically purged from IndexedDB to guarantee complete privacy.
 * During an active session (including page refreshes), the current active project is preserved.
 */
export function initSessionStorage(): void {
  if (typeof window === "undefined") return;

  try {
    const existingSession = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!existingSession) {
      // Cold start / new session: wipe previous project data
      try {
        localStorage.removeItem("edito_last_active_project_id");
        sessionStorage.removeItem(ACTIVE_PROJECT_KEY);
        sessionStorage.removeItem(ACTIVE_TOOL_KEY);

        // Native IndexedDB wipe (no external dependency needed)
        if (window.indexedDB) {
          const req = window.indexedDB.open("edito_studio_db", 1);
          req.onsuccess = (e: any) => {
            const db = e.target.result;
            if (db && db.objectStoreNames && db.objectStoreNames.contains("projects")) {
              const tx = db.transaction("projects", "readwrite");
              tx.objectStore("projects").clear();
            }
          };
        }
      } catch (err) {
        console.warn("Storage wipe notice:", err);
      }

      const newSessionToken = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_TOKEN_KEY, newSessionToken);
    }
  } catch (err) {
    console.warn("Session storage init notice:", err);
  }
}

/**
 * Returns the ID of the current active project uploaded in this session.
 */
export function getActiveProjectId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ACTIVE_PROJECT_KEY);
}

/**
 * Sets the active project ID for the current session.
 */
export function setActiveProjectId(id: string, toolId?: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ACTIVE_PROJECT_KEY, id);
  if (toolId) {
    sessionStorage.setItem(ACTIVE_TOOL_KEY, toolId);
  }
}

/**
 * End Session & Wipe All Data:
 * Clears all projects from IndexedDB, session storage, and local storage tokens.
 */
export function endSessionAndWipeData(): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.clear();
    localStorage.removeItem("edito_last_active_project_id");

    if (window.indexedDB) {
      const req = window.indexedDB.open("edito_studio_db", 1);
      req.onsuccess = (e: any) => {
        const db = e.target.result;
        if (db && db.objectStoreNames && db.objectStoreNames.contains("projects")) {
          const tx = db.transaction("projects", "readwrite");
          tx.objectStore("projects").clear();
        }
      };
    }
  } catch (err) {
    console.warn("Failed to wipe session data:", err);
  }
}
