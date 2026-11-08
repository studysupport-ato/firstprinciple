/**
 * The Back2Basics Google Drive, connected once by an admin.
 *
 * Course reps' PDFs go straight from their phone to this Drive: the server
 * opens a resumable upload session (authenticated with the connected
 * account), the browser sends the file bytes to Google, and the server then
 * checks the file landed in the right course folder and shares it as
 * "anyone with the link can view".
 *
 * Scope is drive.file: the site can only see and change files and folders it
 * created itself, never anything else in that Drive.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/client";

if (typeof window !== "undefined") throw new Error("lib/courseReps/googleDrive.ts is server-only.");

export const SITE_ORIGIN = "https://www.b2bwithkwamina.com";
export const DRIVE_CALLBACK_PATH = "/api/admin/drive/callback";
const SCOPES = ["https://www.googleapis.com/auth/drive.file", "openid", "email"];
const ROOT_FOLDER_NAME = "Back2Basics course materials";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export class DriveNotConnectedError extends Error {
  constructor(message = "Uploads aren’t switched on yet. Ask Back2Basics to connect the Google Drive.") {
    super(message);
    this.name = "DriveNotConnectedError";
  }
}

function clientCredentials() {
  const id = process.env.GOOGLE_DRIVE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim();
  if (!id || !secret) throw new Error("GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET are not set.");
  return { id, secret };
}

export function driveConnectConfigured() {
  return Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID?.trim() && process.env.GOOGLE_DRIVE_CLIENT_SECRET?.trim());
}

function db() {
  return createSupabaseAdminClient() as unknown as { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function buildConsentUrl(state: string) {
  const { id } = clientCredentials();
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: `${SITE_ORIGIN}${DRIVE_CALLBACK_PATH}`,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Called by the OAuth callback: swaps the code for a long-lived refresh token and stores it. */
export async function completeConnection(code: string) {
  const { id, secret } = clientCredentials();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: `${SITE_ORIGIN}${DRIVE_CALLBACK_PATH}`, grant_type: "authorization_code" }),
  });
  const body = (await response.json()) as { refresh_token?: string; id_token?: string; scope?: string; error?: string; error_description?: string };
  if (!response.ok || !body.refresh_token) throw new Error(body.error_description || body.error || "Google did not return a refresh token.");
  // Google lets people untick the Drive box on the consent screen; without it nothing can be uploaded.
  if (!(body.scope ?? "").split(" ").includes(SCOPES[0])) throw new MissingDriveScopeError();
  let email: string | null = null;
  try {
    const payload = JSON.parse(Buffer.from((body.id_token ?? "").split(".")[1] ?? "", "base64url").toString("utf8")) as { email?: string };
    email = payload.email ?? null;
  } catch {
    email = null;
  }
  const { error } = await db().from("drive_connection").upsert({ id: 1, refresh_token: body.refresh_token, account_email: email, root_folder_id: null, connected_at: new Date().toISOString() });
  if (error) throw new Error("Could not save the Drive connection.");
  cachedToken = null;
  return email;
}

export class MissingDriveScopeError extends Error {
  constructor() {
    super("missing-scope");
    this.name = "MissingDriveScopeError";
  }
}

const PAUSED = "Uploads are paused for a moment. Back2Basics is reconnecting Google Drive. Try again later.";

export async function getConnectionInfo(): Promise<{ email: string | null; connectedAt: string; driveAccess: boolean } | null> {
  const { data } = await db().from("drive_connection").select("account_email,connected_at").eq("id", 1).maybeSingle();
  if (!data) return null;
  let driveAccess = false;
  try {
    const token = await accessToken();
    const info = (await (await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token)}`)).json()) as { scope?: string };
    driveAccess = (info.scope ?? "").split(" ").includes(SCOPES[0]);
  } catch {
    driveAccess = false;
  }
  return { email: data.account_email ?? null, connectedAt: data.connected_at, driveAccess };
}

let cachedToken: { value: string; expires: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
  const { data } = await db().from("drive_connection").select("refresh_token").eq("id", 1).maybeSingle();
  if (!data?.refresh_token) throw new DriveNotConnectedError();
  const { id, secret } = clientCredentials();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: data.refresh_token, grant_type: "refresh_token" }),
  });
  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!response.ok || !body.access_token) throw new DriveNotConnectedError();
  cachedToken = { value: body.access_token, expires: Date.now() + (body.expires_in ?? 3000) * 1000 };
  return body.access_token;
}

async function drive<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const response = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!response.ok) {
    const text = (await response.text()).slice(0, 300);
    if (response.status === 403 && /insufficient authentication scopes|insufficientPermissions/i.test(text)) {
      console.error("[drive] the connected Google account did not grant Drive access; reconnect it in the admin panel");
      throw new DriveNotConnectedError(PAUSED);
    }
    throw new Error(`Google Drive ${response.status}: ${text.slice(0, 200)}`);
  }
  return (response.status === 204 ? null : await response.json()) as T;
}

function clean(name: string) {
  return name.replace(/[\\/'"]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "Untitled";
}

async function findOrCreateFolder(name: string, parentId: string | null): Promise<string> {
  const safe = clean(name);
  const q = [`name = '${safe.replace(/'/g, "\\'")}'`, `mimeType = '${FOLDER_MIME}'`, "trashed = false", parentId ? `'${parentId}' in parents` : "'root' in parents"].join(" and ");
  const found = await drive<{ files: Array<{ id: string }> }>(`files?${new URLSearchParams({ q, fields: "files(id)", pageSize: "1" })}`);
  if (found.files[0]) return found.files[0].id;
  const created = await drive<{ id: string }>("files?fields=id", { method: "POST", body: JSON.stringify({ name: safe, mimeType: FOLDER_MIME, parents: parentId ? [parentId] : undefined }) });
  return created.id;
}

async function rootFolder(): Promise<string> {
  const { data } = await db().from("drive_connection").select("root_folder_id").eq("id", 1).maybeSingle();
  if (data?.root_folder_id) return data.root_folder_id as string;
  const id = await findOrCreateFolder(ROOT_FOLDER_NAME, null);
  await db().from("drive_connection").update({ root_folder_id: id }).eq("id", 1);
  return id;
}

/** Back2Basics course materials / <Programme> / Year N / <Course>, created once and remembered on the course. */
export async function courseUploadFolder(course: { id: string; courseCode?: string; courseTitle: string; studyYear?: number | null; driveFolderId?: string | null }, programmeName: string): Promise<string> {
  if (course.driveFolderId) return course.driveFolderId;
  const root = await rootFolder();
  const programme = await findOrCreateFolder(programmeName, root);
  const year = await findOrCreateFolder(`Year ${course.studyYear ?? 1}`, programme);
  const folder = await findOrCreateFolder(course.courseCode ? `${course.courseCode} ${course.courseTitle}` : course.courseTitle, year);
  await db().from("course_materials").update({ drive_folder_id: folder }).eq("id", course.id);
  return folder;
}

/** Back2Basics course materials / Skills training / <Programme>, for skills-session preview photos. */
export async function skillsUploadFolder(programmeName: string): Promise<string> {
  const root = await rootFolder();
  const skills = await findOrCreateFolder("Skills training", root);
  return findOrCreateFolder(programmeName, skills);
}

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

/** Opens a resumable upload; the browser PUTs the file bytes to the returned URL. */
export const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export async function startUpload(folderId: string, file: { name: string; type: string; size: number }, options: { images?: boolean } = {}) {
  if (!ALLOWED_TYPES.has(file.type) && !(options.images && IMAGE_TYPES.has(file.type))) {
    throw new Error(options.images ? "Upload a PDF or a picture." : "Upload a PDF, PowerPoint or Word file.");
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) throw new Error("Files can be up to 100 MB.");
  const token = await accessToken();
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,size,mimeType,parents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": file.type,
      "X-Upload-Content-Length": String(file.size),
      // The browser uploads to this session, so Google must allow our site's origin.
      Origin: SITE_ORIGIN,
    },
    body: JSON.stringify({ name: clean(file.name), parents: [folderId] }),
  });
  const location = response.headers.get("location");
  if (response.status === 403) throw new DriveNotConnectedError(PAUSED);
  if (!response.ok || !location) throw new Error("Google Drive would not start the upload. Try again.");
  return location;
}

/** After the browser's upload: confirm the file is in the course folder and make it viewable by link. */
export async function finishUpload(fileId: string, folderId: string) {
  const file = await drive<{ id: string; name: string; size?: string; mimeType: string; parents?: string[] }>(`files/${encodeURIComponent(fileId)}?fields=id,name,size,mimeType,parents`);
  if (!file.parents?.includes(folderId)) throw new Error("That file is not in this course’s folder.");
  await drive(`files/${encodeURIComponent(fileId)}/permissions?fields=id`, { method: "POST", body: JSON.stringify({ role: "reader", type: "anyone" }) });
  return { id: file.id, name: file.name, size: file.size ? Number(file.size) : null };
}

/** Moves a file the site uploaded to the Drive's bin (recoverable for 30 days). */
export async function trashUploadedFile(fileId: string) {
  try {
    await drive(`files/${encodeURIComponent(fileId)}`, { method: "PATCH", body: JSON.stringify({ trashed: true }) });
  } catch {
    /* already gone, or not ours */
  }
}
