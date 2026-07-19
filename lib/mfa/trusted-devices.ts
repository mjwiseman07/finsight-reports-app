import { getSupabaseAdmin } from "@/lib/supabase-admin";

const COOKIE_NAME = "advisacor_mfa_device_id";
const MFA_VERIFIED_COOKIE = "advisacor_mfa_verified";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const MFA_VERIFIED_MAX_AGE = 60 * 60; // 1 hour after MFA verify

function getSecret(): string {
  const secret = process.env.MFA_TRUSTED_DEVICE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("MFA_TRUSTED_DEVICE_SECRET missing or too short");
  }
  return secret;
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hmac(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toBase64Url(sig);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hashDeviceId(deviceId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(deviceId));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function trustedDeviceCookieName() {
  return COOKIE_NAME;
}

export function mfaVerifiedCookieName() {
  return MFA_VERIFIED_COOKIE;
}

export async function signDeviceCookie(deviceId: string): Promise<string> {
  return `${deviceId}.${await hmac(deviceId)}`;
}

export async function verifyDeviceCookie(raw: string | undefined): Promise<string | null> {
  if (!raw) return null;
  const dot = raw.lastIndexOf(".");
  if (dot < 0) return null;
  const deviceId = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  const expected = await hmac(deviceId);
  if (!safeEqual(sig, expected)) return null;
  return deviceId;
}

export async function signMfaVerifiedCookie(userId: string): Promise<{
  cookieValue: string;
  maxAgeSeconds: number;
}> {
  const exp = Date.now() + MFA_VERIFIED_MAX_AGE * 1000;
  const payload = `${userId}.${exp}`;
  return {
    cookieValue: `${payload}.${await hmac(payload)}`,
    maxAgeSeconds: MFA_VERIFIED_MAX_AGE,
  };
}

export async function verifyMfaVerifiedCookie(
  raw: string | undefined,
  userId: string,
): Promise<boolean> {
  if (!raw) return false;
  const lastDot = raw.lastIndexOf(".");
  if (lastDot < 0) return false;
  const payload = raw.slice(0, lastDot);
  const sig = raw.slice(lastDot + 1);
  if (!safeEqual(sig, await hmac(payload))) return false;
  const sep = payload.lastIndexOf(".");
  if (sep < 0) return false;
  const uid = payload.slice(0, sep);
  const exp = Number(payload.slice(sep + 1));
  if (uid !== userId || !Number.isFinite(exp) || Date.now() > exp) return false;
  return true;
}

export async function addTrustedDevice(
  userId: string,
  userAgent: string | null,
  ipAddress: string | null,
): Promise<{ deviceId: string; cookieValue: string; maxAgeSeconds: number }> {
  const deviceId = crypto.randomUUID();
  const hash = await hashDeviceId(deviceId);
  const admin = getSupabaseAdmin();
  await admin.from("mfa_trusted_devices").insert({
    user_id: userId,
    device_id_hash: hash,
    user_agent: userAgent ? userAgent.slice(0, 500) : null,
    ip_first_seen: ipAddress,
    ip_last_seen: ipAddress,
  });
  return {
    deviceId,
    cookieValue: await signDeviceCookie(deviceId),
    maxAgeSeconds: COOKIE_MAX_AGE,
  };
}

export async function isTrustedDevice(userId: string, deviceCookieRaw: string | undefined) {
  const deviceId = await verifyDeviceCookie(deviceCookieRaw);
  if (!deviceId) return false;
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("mfa_trusted_devices")
    .select("id, expires_at, revoked_at")
    .eq("user_id", userId)
    .eq("device_id_hash", await hashDeviceId(deviceId))
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!data) return false;
  await admin
    .from("mfa_trusted_devices")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return true;
}

export async function listUserTrustedDevices(userId: string) {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("mfa_trusted_devices")
    .select("id, user_agent, ip_last_seen, created_at, last_used_at, expires_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("last_used_at", { ascending: false, nullsFirst: false });
  return data ?? [];
}

export async function revokeTrustedDevice(userId: string, deviceRowId: string) {
  const admin = getSupabaseAdmin();
  return admin
    .from("mfa_trusted_devices")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", deviceRowId)
    .eq("user_id", userId);
}

export async function revokeAllTrustedDevices(userId: string) {
  const admin = getSupabaseAdmin();
  return admin
    .from("mfa_trusted_devices")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("revoked_at", null);
}
