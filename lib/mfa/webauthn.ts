import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  Base64URLString,
} from "@simplewebauthn/types";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const RP_NAME = process.env.NEXT_PUBLIC_WEBAUTHN_RP_NAME || "Advisacor";
const RP_ID = process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || "advisacor.com";
const ORIGIN = process.env.NEXT_PUBLIC_WEBAUTHN_ORIGIN || "https://app.advisacor.com";

function toBase64Url(bytes: Buffer | Uint8Array): Base64URLString {
  return Buffer.from(bytes).toString("base64url");
}

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function asBytea(value: unknown): Buffer {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (typeof value === "string") {
    // PostgREST may return hex (\x...) or base64 depending on client/config.
    if (value.startsWith("\\x")) return Buffer.from(value.slice(2), "hex");
    return Buffer.from(value, "base64");
  }
  throw new Error("unsupported bytea encoding");
}

export async function buildRegistrationOptions(userId: string, userEmail: string) {
  const admin = getSupabaseAdmin();
  const { data: existing } = await admin
    .from("user_webauthn_credentials")
    .select("credential_id, transports")
    .eq("user_id", userId);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode(userId),
    userName: userEmail,
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((c: { credential_id: unknown; transports: string[] | null }) => ({
      id: toBase64Url(asBytea(c.credential_id)),
      transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    supportedAlgorithmIDs: [-8, -7, -257],
  });

  await admin.from("mfa_webauthn_challenges").insert({
    user_id: userId,
    challenge: options.challenge,
    purpose: "register",
  });

  return options;
}

export async function verifyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  friendlyName: string,
): Promise<{ ok: boolean; credentialId?: string; error?: string }> {
  const admin = getSupabaseAdmin();
  const { data: chal } = await admin
    .from("mfa_webauthn_challenges")
    .select("challenge, expires_at")
    .eq("user_id", userId)
    .eq("purpose", "register")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!chal) return { ok: false, error: "no valid challenge" };

  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: chal.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: "not verified" };
  }

  const { credential } = verification.registrationInfo;

  const { data: inserted, error } = await admin
    .from("user_webauthn_credentials")
    .insert({
      user_id: userId,
      credential_id: fromBase64Url(credential.id),
      public_key: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: response.response.transports ?? credential.transports ?? [],
      friendly_name: friendlyName || "Security key",
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await admin
    .from("mfa_webauthn_challenges")
    .delete()
    .eq("user_id", userId)
    .eq("purpose", "register");

  return { ok: true, credentialId: inserted!.id };
}

export async function buildAuthenticationOptions(userId: string) {
  const admin = getSupabaseAdmin();
  const { data: creds } = await admin
    .from("user_webauthn_credentials")
    .select("credential_id, transports")
    .eq("user_id", userId);

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "preferred",
    allowCredentials: (creds ?? []).map((c: { credential_id: unknown; transports: string[] | null }) => ({
      id: toBase64Url(asBytea(c.credential_id)),
      transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
    })),
  });

  await admin.from("mfa_webauthn_challenges").insert({
    user_id: userId,
    challenge: options.challenge,
    purpose: "authenticate",
  });

  return options;
}

export async function verifyAuthentication(
  userId: string,
  response: AuthenticationResponseJSON,
): Promise<{ ok: boolean; credentialId?: string; error?: string }> {
  const admin = getSupabaseAdmin();
  const { data: chal } = await admin
    .from("mfa_webauthn_challenges")
    .select("challenge, expires_at")
    .eq("user_id", userId)
    .eq("purpose", "authenticate")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!chal) return { ok: false, error: "no valid challenge" };

  const credIdBytes = fromBase64Url(response.id);
  const { data: cred } = await admin
    .from("user_webauthn_credentials")
    .select("id, credential_id, public_key, counter, transports")
    .eq("credential_id", credIdBytes)
    .eq("user_id", userId)
    .maybeSingle();

  if (!cred) return { ok: false, error: "credential not found" };

  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: chal.challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: toBase64Url(asBytea(cred.credential_id)),
        publicKey: new Uint8Array(asBytea(cred.public_key)),
        counter: Number(cred.counter),
        transports: (cred.transports ?? []) as AuthenticatorTransportFuture[],
      },
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  if (!verification.verified) return { ok: false, error: "not verified" };

  await admin
    .from("user_webauthn_credentials")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", cred.id);

  await admin
    .from("mfa_webauthn_challenges")
    .delete()
    .eq("user_id", userId)
    .eq("purpose", "authenticate");

  return { ok: true, credentialId: cred.id };
}

export async function listUserWebAuthnCredentials(userId: string) {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("user_webauthn_credentials")
    .select("id, friendly_name, transports, created_at, last_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function userHasWebAuthn(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { count } = await admin
    .from("user_webauthn_credentials")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return (count ?? 0) > 0;
}

export async function deleteWebAuthnCredential(userId: string, credentialId: string) {
  const admin = getSupabaseAdmin();
  return admin
    .from("user_webauthn_credentials")
    .delete()
    .eq("id", credentialId)
    .eq("user_id", userId);
}

export async function renameWebAuthnCredential(
  userId: string,
  credentialId: string,
  friendlyName: string,
) {
  const admin = getSupabaseAdmin();
  return admin
    .from("user_webauthn_credentials")
    .update({ friendly_name: friendlyName.slice(0, 80) })
    .eq("id", credentialId)
    .eq("user_id", userId);
}
