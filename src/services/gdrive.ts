import type { AppData } from "@/types";

const CLIENT_ID = "647963986605-944tkn3ej3sru62pkf2lr6lmbuslq242.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile";
const FILENAME = "espace-scolaire-sync.json";

const TOKEN_KEY = "gdrive_token";
const TOKEN_EXP_KEY = "gdrive_token_exp";

// Les jetons Google "implicit flow" durent ~1 h. On garde une marge de 60 s.
const EXPIRY_MARGIN_MS = 60_000;

let tokenClient: any = null;

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const exp = Number(localStorage.getItem(TOKEN_EXP_KEY) || 0);
  // Jeton expiré (ou date inconnue) -> on le considère invalide
  if (!exp || Date.now() >= exp - EXPIRY_MARGIN_MS) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXP_KEY);
    return null;
  }
  return token;
}

function storeToken(token: string, expiresInSec?: number | string) {
  const ttl = (Number(expiresInSec) || 3600) * 1000;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + ttl));
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXP_KEY);
}

export function initGoogleIdentity(onTokenReceived?: (token: string) => void) {
  if (typeof window === "undefined" || !(window as any).google) return;

  tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp: any) => {
      if (resp.access_token) {
        storeToken(resp.access_token, resp.expires_in);
        onTokenReceived?.(resp.access_token);
      } else if (resp.error) {
        console.warn("Auth response error/cancel:", resp.error);
      }
    },
  });
}

export function promptGoogleLogin() {
  if (!tokenClient) initGoogleIdentity();
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: "consent" });
  } else {
    console.warn("Google Identity Services n'est pas encore chargé (connexion internet ?).");
  }
}

/** Tente un renouvellement silencieux du token (prompt: '') */
export async function silentRefreshGoogleToken(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !(window as any).google) return resolve(false);
    let settled = false;
    const done = (v: boolean) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    // Sécurité : si Google ne répond jamais (popup bloquée...), on ne bloque pas la synchro
    setTimeout(() => done(false), 10_000);

    const tempClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.access_token) {
          storeToken(resp.access_token, resp.expires_in);
          done(true);
        } else {
          done(false);
        }
      },
      error_callback: () => done(false),
    });
    tempClient.requestAccessToken({ prompt: "" });
  });
}

export function logoutGoogle() {
  const token = readStoredToken();
  clearToken();
  // Révoque le jeton côté Google quand c'est possible
  try {
    const g = (window as any).google;
    if (token && g?.accounts?.oauth2?.revoke) g.accounts.oauth2.revoke(token, () => {});
  } catch {
    /* ignoré */
  }
}

export function isGoogleConnected(): boolean {
  return readStoredToken() !== null;
}

/**
 * Exécute une requête Drive authentifiée. En cas de 401 (jeton expiré),
 * tente UN renouvellement silencieux puis rejoue la requête.
 */
async function driveFetch(url: string, init: RequestInit = {}, retry = true): Promise<Response | null> {
  const token = readStoredToken();
  if (!token) return null;
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    clearToken();
    if (retry && (await silentRefreshGoogleToken())) return driveFetch(url, init, false);
    return null;
  }
  return res;
}

async function findSyncFileId(): Promise<string | null> {
  try {
    const query = encodeURIComponent(`name = '${FILENAME}' and trashed = false`);
    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id)`);
    if (!res || !res.ok) return null;
    const data = await res.json();
    return data.files?.[0]?.id || null;
  } catch {
    return null;
  }
}

export async function uploadToGoogleDrive(data: AppData): Promise<boolean> {
  try {
    const fileId = await findSyncFileId();
    const content = JSON.stringify(data);

    if (fileId) {
      const res = await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: content,
      });
      return !!res?.ok;
    }

    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify({ name: FILENAME, mimeType: "application/json" })], { type: "application/json" })
    );
    form.append("file", new Blob([content], { type: "application/json" }));
    const res = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      body: form,
    });
    return !!res?.ok;
  } catch (err) {
    console.error("Erreur d'envoi vers Google Drive", err);
    return false;
  }
}

export async function downloadFromGoogleDrive(): Promise<unknown | null> {
  try {
    const fileId = await findSyncFileId();
    if (!fileId) return null;
    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
    if (!res || !res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Erreur de récupération Google Drive", err);
    return null;
  }
}

export async function getGoogleUserFirstName(): Promise<string | null> {
  try {
    const res = await driveFetch("https://www.googleapis.com/oauth2/v3/userinfo");
    if (!res || !res.ok) return null;
    const data = await res.json();
    return data.given_name || data.name?.split(" ")[0] || null;
  } catch {
    return null;
  }
}

export async function uploadFileToDrive(file: File | Blob, name: string): Promise<string | null> {
  try {
    const metadata = {
      name: `espace-scolaire-${name}`,
      mimeType: file.type || "application/octet-stream",
    };
    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", file);

    const res = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
      method: "POST",
      body: form,
    });
    if (!res || !res.ok) return null;
    const data = await res.json();
    return data.id || null;
  } catch (e) {
    console.error("Erreur upload fichier Drive", e);
    return null;
  }
}

export async function downloadFileFromDrive(driveFileId: string): Promise<Blob | null> {
  try {
    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`);
    if (!res || !res.ok) return null;
    return await res.blob();
  } catch (e) {
    console.error("Erreur download fichier Drive", e);
    return null;
  }
}

export async function deleteFileFromDrive(driveFileId: string): Promise<void> {
  try {
    await driveFetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}`, { method: "DELETE" });
  } catch (e) {
    console.error("Erreur delete fichier Drive", e);
  }
}
