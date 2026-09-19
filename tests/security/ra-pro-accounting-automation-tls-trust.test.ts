/**
 * Disposable TLS trust tests for the accounting-automation applicator.
 * Locally generated certificates only. Never contacts production and never
 * disables certificate verification.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import tls from "node:tls";
import { spawnSync } from "node:child_process";
import {
  OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
  OFFICIAL_SUPABASE_PROD_CA_2021_PEM,
  assertNoForbiddenSslMode,
  assertNoTlsBypass,
  buildDisposableVerifySsl,
  buildProductionSsl,
  loadOfficialEmbeddedCa,
  loadPinnedCaFromPem,
} from "../../scripts/security/ra-pro-accounting-automation-tls-ca.js";
import {
  buildPgClientConfig,
  scopedClientOptions,
} from "../../scripts/security/ra-pro-accounting-automation-apply-core.js";

const REF = "jzmdgwwiestcmmeuhhkr";

function resolveOpenSsl() {
  const candidates = [
    process.env.OPENSSL_BIN,
    "openssl",
    "C:\\Program Files\\Git\\usr\\bin\\openssl.exe",
    "C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe",
  ].filter(Boolean) as string[];
  for (const bin of candidates) {
    const run = spawnSync(bin, ["version"], { encoding: "utf8", windowsHide: true });
    if (run.status === 0) return bin;
  }
  throw new Error("MANDATORY_DEP_MISSING: OpenSSL is required for disposable TLS tests");
}

function openssl(bin: string, args: string[]) {
  const run = spawnSync(bin, args, { encoding: "utf8", windowsHide: true });
  if (run.status !== 0) {
    throw new Error(`openssl failed: ${args.join(" ")}\n${run.stderr || run.stdout || ""}`);
  }
}

function writeExt(dir: string, dns: string) {
  const file = path.join(dir, `ext-${crypto.randomBytes(3).toString("hex")}.cnf`);
  fs.writeFileSync(
    file,
    `[req]\ndistinguished_name=req\n[v3_ca]\nbasicConstraints=critical,CA:TRUE\n[v3_server]\nbasicConstraints=CA:FALSE\nextendedKeyUsage=serverAuth\nsubjectAltName=DNS:${dns}\n`,
  );
  return file;
}

function makeCa(bin: string, dir: string, name: string, extra: string[] = []) {
  const key = path.join(dir, `${name}.key`);
  const crt = path.join(dir, `${name}.crt`);
  openssl(bin, ["genrsa", "-out", key, "2048"]);
  openssl(bin, [
    "req", "-x509", "-new", "-nodes", "-key", key, "-sha256", "-out", crt,
    "-subj", `/CN=${name}`, ...extra,
  ]);
  return { key, crt, pem: fs.readFileSync(crt, "utf8") };
}

function makeServer(bin: string, dir: string, ca: { key: string; crt: string }, dns: string) {
  const key = path.join(dir, `${dns}.key`);
  const csr = path.join(dir, `${dns}.csr`);
  const crt = path.join(dir, `${dns}.crt`);
  openssl(bin, ["genrsa", "-out", key, "2048"]);
  openssl(bin, ["req", "-new", "-key", key, "-out", csr, "-subj", `/CN=${dns}`]);
  openssl(bin, [
    "x509", "-req", "-in", csr, "-CA", ca.crt, "-CAkey", ca.key, "-CAcreateserial",
    "-out", crt, "-days", "2", "-extfile", writeExt(dir, dns), "-extensions", "v3_server",
  ]);
  return { key: fs.readFileSync(key), cert: fs.readFileSync(crt) };
}

function listen(material: { key: Buffer; cert: Buffer }) {
  return new Promise<tls.Server>((resolve) => {
    const server = tls.createServer(material, (socket) => socket.end());
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function handshake(port: number, ssl: tls.ConnectionOptions) {
  return new Promise<void>((resolve, reject) => {
    const socket = tls.connect(
      {
        host: "127.0.0.1",
        port,
        servername: ssl.servername,
        ca: ssl.ca,
        rejectUnauthorized: true,
        checkServerIdentity: tls.checkServerIdentity,
        minVersion: "TLSv1.2",
      },
      () => {
        socket.end();
        resolve();
      },
    );
    socket.on("error", reject);
  });
}

async function expectHandshakeFailure(port: number, ssl: tls.ConnectionOptions, pattern: RegExp) {
  try {
    await handshake(port, ssl);
    throw new Error("handshake unexpectedly succeeded");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    const blob = `${err.code || ""} ${err.message || ""}`;
    expect(blob).toMatch(pattern);
  }
}

describe("accounting-automation TLS trust", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-tls-"));
  const bin = resolveOpenSsl();
  const approved = makeCa(bin, dir, "ApprovedLocalCA");
  const other = makeCa(bin, dir, "OtherLocalCA");
  const host = "db.local.test";

  it("pins the reviewed Supabase root and keeps verification on", () => {
    const loaded = loadOfficialEmbeddedCa();
    expect(loaded.der_sha256).toBe(OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256);
    expect(loaded.subject).toContain("Supabase Root 2021 CA");
    const beforeExtra = process.env.NODE_EXTRA_CA_CERTS;
    const ssl = buildProductionSsl("aws-0-us-east-1.pooler.supabase.com", {});
    expect(process.env.NODE_EXTRA_CA_CERTS).toBe(beforeExtra);
    expect(ssl.rejectUnauthorized).toBe(true);
    expect(ssl.ca).toBe(loaded.pem);
    expect(ssl.checkServerIdentity).toBe(tls.checkServerIdentity);
    expect(ssl.minVersion).toBe("TLSv1.2");
    expect(ssl.servername).toBe("aws-0-us-east-1.pooler.supabase.com");
    expect(ssl).not.toHaveProperty("rejectUnauthorized", false);
  });

  it("keeps direct, session-pooler, and transaction-pooler server names", () => {
    const direct = buildPgClientConfig(
      `postgres://user:redacted@db.${REF}.supabase.co:5432/postgres?sslmode=require`,
      {},
    );
    const session = buildPgClientConfig(
      `postgres://postgres.${REF}:redacted@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`,
      {},
    );
    const transaction = buildPgClientConfig(
      `postgres://postgres.${REF}:redacted@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=verify-full`,
      {},
    );
    for (const config of [direct, session, transaction]) {
      expect(config.ssl.servername).toBe(config.host);
      expect(config.ssl.rejectUnauthorized).toBe(true);
      expect(config.ssl.checkServerIdentity).toBe(tls.checkServerIdentity);
      expect(config).not.toHaveProperty("connectionString");
      const options = scopedClientOptions(config, {});
      expect(options).not.toHaveProperty("connectionString");
      expect(options.ssl.rejectUnauthorized).toBe(true);
      expect(options.ssl.servername).toBe(config.host);
      expect(options.ssl.ca).toBe(OFFICIAL_SUPABASE_PROD_CA_2021_PEM.endsWith("\n")
        ? OFFICIAL_SUPABASE_PROD_CA_2021_PEM
        : `${OFFICIAL_SUPABASE_PROD_CA_2021_PEM}\n`);
    }
  });

  it("rejects bypass flags before any connection", () => {
    expect(() => assertNoTlsBypass({ NODE_TLS_REJECT_UNAUTHORIZED: "0" })).toThrow(/BLOCKED_TLS_BYPASS/);
    expect(() => assertNoTlsBypass({ NODE_EXTRA_CA_CERTS: "C:\\extra.pem" })).toThrow(/BLOCKED_TLS_BYPASS/);
    expect(() => assertNoForbiddenSslMode("no-verify")).toThrow(/BLOCKED_TLS_BYPASS/);
    expect(() => buildDisposableVerifySsl({ rejectUnauthorized: false, caPem: approved.pem, servername: host })).toThrow(
      /BLOCKED_TLS_BYPASS/,
    );
    expect(() =>
      scopedClientOptions(
        {
          host: `db.${REF}.supabase.co`,
          port: 5432,
          user: "user",
          password: "redacted",
          database: "postgres",
          ssl: { rejectUnauthorized: false },
        },
        {},
      ),
    ).toThrow(/BLOCKED_TLS_BYPASS/);
    expect(() => scopedClientOptions({ connectionString: "postgres://x", host: "db.example" }, {})).toThrow(
      /MALFORMED_DATABASE_URL/,
    );
  });

  it("rejects missing, tampered, extra, expired, and not-yet-valid CA material before connection", () => {
    expect(() => loadPinnedCaFromPem("not a certificate")).toThrow(/BLOCKED_TLS_CA_INVALID/);
    expect(() => buildDisposableVerifySsl({ servername: host })).toThrow(/BLOCKED_TLS_CA_INVALID/);
    const tampered = approved.pem.replace(/[A-Za-z0-9+/]{12}/, "AAAAAAAAAAAA");
    expect(() => loadPinnedCaFromPem(tampered, "deadbeef")).toThrow(/BLOCKED_TLS_CA_PIN_MISMATCH|BLOCKED_TLS_CA_INVALID/);
    expect(() => loadPinnedCaFromPem(`${approved.pem}${other.pem}`)).toThrow(/BLOCKED_TLS_CA_EXTRA/);
    expect(() =>
      buildDisposableVerifySsl({ caPem: approved.pem, extraCaPem: other.pem, servername: host }),
    ).toThrow(/BLOCKED_TLS_CA_EXTRA/);
    expect(() =>
      scopedClientOptions(
        {
          host: "aws-0-us-east-1.pooler.supabase.com",
          port: 5432,
          user: "user",
          password: "redacted",
          database: "postgres",
          ssl: { rejectUnauthorized: true, ca: [approved.pem, other.pem] },
        },
        {},
      ),
    ).toThrow(/BLOCKED_TLS_CA_EXTRA/);
    const expired = makeCa(bin, dir, "ExpiredLocalCA", ["-not_before", "20200101000000Z", "-not_after", "20200102000000Z"]);
    const future = makeCa(bin, dir, "FutureLocalCA", ["-not_before", "20350101000000Z", "-not_after", "20360101000000Z"]);
    expect(() => loadPinnedCaFromPem(expired.pem)).toThrow(/BLOCKED_TLS_CA_EXPIRED/);
    expect(() => loadPinnedCaFromPem(future.pem)).toThrow(/BLOCKED_TLS_CA_NOT_YET_VALID/);
  });

  it("accepts only the approved CA and matching hostname on a disposable listener", async () => {
    const good = makeServer(bin, dir, approved, host);
    const server = await listen(good);
    const port = (server.address() as tls.AddressInfo).port;
    try {
      const ssl = buildDisposableVerifySsl({ caPem: approved.pem, servername: host });
      expect(ssl.rejectUnauthorized).toBe(true);
      await handshake(port, ssl);
      await expectHandshakeFailure(
        port,
        buildDisposableVerifySsl({ caPem: other.pem, servername: host }),
        /UNABLE_TO_VERIFY_LEAF_SIGNATURE|unable to verify the first certificate|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_GET_ISSUER_CERT/,
      );
      const selfSigned = makeCa(bin, dir, "SelfSignedLeaf");
      const selfServer = await listen({ key: fs.readFileSync(selfSigned.key), cert: Buffer.from(selfSigned.pem) });
      const selfPort = (selfServer.address() as tls.AddressInfo).port;
      try {
        await expectHandshakeFailure(
          selfPort,
          buildDisposableVerifySsl({ caPem: approved.pem, servername: "SelfSignedLeaf" }),
          /SELF_SIGNED|UNABLE_TO_VERIFY_LEAF_SIGNATURE|unable to verify the first certificate|DEPTH_ZERO/,
        );
      } finally {
        selfServer.close();
      }
      const mismatch = makeServer(bin, dir, approved, "wrong.example");
      const mismatchServer = await listen(mismatch);
      const mismatchPort = (mismatchServer.address() as tls.AddressInfo).port;
      try {
        await expectHandshakeFailure(
          mismatchPort,
          buildDisposableVerifySsl({ caPem: approved.pem, servername: host }),
          /ERR_TLS_CERT_ALTNAME_INVALID|Hostname\/IP does not match/,
        );
      } finally {
        mismatchServer.close();
      }
    } finally {
      server.close();
    }
  });

  it("checks the ceremony seal before the credential boundary", () => {
    const ceremony = fs.readFileSync(
      path.join(process.cwd(), "scripts/security/operator-ra-pro-accounting-automation-production-dryrun-ceremony.ps1"),
      "utf8",
    );
    const call = ceremony.indexOf("Assert-EmbeddedTlsCaSeal -Auth $auth -Tip $tip");
    const boundary = ceremony.indexOf('Set-PrePromptPhase "credential_boundary"');
    expect(call).toBeGreaterThan(0);
    expect(boundary).toBeGreaterThan(call);
    expect(ceremony).not.toMatch(/rejectUnauthorized\s*=\s*\$false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*"0"/);
  });
});
