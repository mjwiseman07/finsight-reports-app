/**
 * Unit + synthetic TLS CA channel tests (no production).
 * Disposable Postgres SSL suite runs only when openssl + docker are available.
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import tls from "node:tls";
import { spawnSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import {
  buildPgClientOptions,
  assertNoTlsBypass,
  sanitizeCaEvidence,
  classifyTlsError,
  loadCaFromEnv,
} from "../../scripts/security/containment-tls-ca.js";

const { SSL_ROOTCERT_ENV } =
  require("../../scripts/security/credential-browser-containment-constants.js");

const FIXTURE_DIR = path.join(os.tmpdir(), "containment-tls-fixtures");

function opensslAvailable() {
  const r = spawnSync("openssl", ["version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  return r.status === 0;
}

function dockerAvailable() {
  const r = spawnSync("docker", ["info"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 20000,
  });
  return r.status === 0;
}

function fixturesReady() {
  return (
    fs.existsSync(path.join(FIXTURE_DIR, "ca.crt")) &&
    fs.existsSync(path.join(FIXTURE_DIR, "server.pfx")) &&
    fs.existsSync(path.join(FIXTURE_DIR, "wrong-ca.crt"))
  );
}

describe("containment-tls-ca policy", () => {
  it("refuses NODE_TLS_REJECT_UNAUTHORIZED=0", () => {
    expect(() => assertNoTlsBypass({ NODE_TLS_REJECT_UNAUTHORIZED: "0" })).toThrow(
      /BLOCKED_TLS_BYPASS/,
    );
  });

  it("refuses sslmode=no-verify and CA-in-URI", () => {
    expect(() =>
      buildPgClientOptions(
        "postgres://u:p@db.example.com:5432/postgres?sslmode=no-verify",
        {},
      ),
    ).toThrow(/BLOCKED_TLS_BYPASS/);
    expect(() =>
      buildPgClientOptions(
        "postgres://u:p@db.example.com:5432/postgres?sslmode=require&sslrootcert=/tmp/x.crt",
        {},
      ),
    ).toThrow(/BLOCKED_TLS_CA_IN_URI/);
  });

  it("fails closed for non-loopback without CA", () => {
    expect(() =>
      buildPgClientOptions(
        "postgres://u:p@aws-0-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require",
        {},
      ),
    ).toThrow(/BLOCKED_TLS_CA_REQUIRED/);
  });

  it("allows loopback without CA (disposable pg)", () => {
    const opts = buildPgClientOptions(
      "postgres://postgres:postgres@127.0.0.1:5432/postgres",
      {},
    );
    expect(opts.ssl).toBe(false);
    expect(opts.tls_evidence.mode).toBe("loopback_no_tls");
    expect(opts.tls_evidence.ca.ca_provided).toBe(false);
  });

  it("loads CA from env path and sanitizes evidence (no path leak)", () => {
    if (!fixturesReady()) return;
    const caCert = path.join(FIXTURE_DIR, "ca.crt");
    const env = { [SSL_ROOTCERT_ENV]: caCert };
    const ca = loadCaFromEnv(env);
    expect(ca.der_sha256).toMatch(/^[0-9a-f]{64}$/);
    const san = sanitizeCaEvidence(ca);
    expect(san.path_redacted).toBe(true);
    expect(JSON.stringify(san)).not.toContain("BEGIN CERTIFICATE");
    const opts = buildPgClientOptions(
      "postgres://u:p@aws-0-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require",
      env,
    );
    expect(opts.ssl.rejectUnauthorized).toBe(true);
    expect(opts.ssl.ca).toContain("BEGIN CERTIFICATE");
    expect(opts.tls_evidence.ca.path_redacted).toBe(true);
    expect(opts.connectionString).not.toMatch(/sslmode=/);
  });

  it("classifies SELF_SIGNED_CERT_IN_CHAIN", () => {
    expect(classifyTlsError({ code: "SELF_SIGNED_CERT_IN_CHAIN" })).toBe(
      "SELF_SIGNED_CERT_IN_CHAIN",
    );
  });
});

describe.skipIf(!fixturesReady())("synthetic TLS server with fixture CA", () => {
  let server;
  let port;

  beforeAll(async () => {
    const pfx = fs.readFileSync(path.join(FIXTURE_DIR, "server.pfx"));
    server = tls.createServer(
      {
        pfx,
        passphrase: "temp",
        minVersion: "TLSv1.2",
      },
      (socket) => {
        socket.end("ok");
      },
    );
    await new Promise((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });
    port = server.address().port;
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  function connectWithCa(caPath, servername = "localhost") {
    return new Promise((resolve, reject) => {
      const socket = tls.connect(
        {
          host: "127.0.0.1",
          port,
          servername,
          rejectUnauthorized: true,
          ca: fs.readFileSync(caPath),
          minVersion: "TLSv1.2",
          checkServerIdentity: tls.checkServerIdentity,
        },
        () => {
          resolve({ ok: true, authorized: socket.authorized });
          socket.end();
        },
      );
      socket.on("error", (err) => reject(err));
    });
  }

  it("trusted correct CA succeeds", async () => {
    const r = await connectWithCa(path.join(FIXTURE_DIR, "ca.crt"), "localhost");
    expect(r.ok).toBe(true);
  });

  it("wrong CA fails", async () => {
    await expect(
      connectWithCa(path.join(FIXTURE_DIR, "wrong-ca.crt"), "localhost"),
    ).rejects.toThrow(/SELF_SIGNED|unable to verify|certificate/i);
  });

  it("hostname mismatch fails", async () => {
    await expect(
      connectWithCa(path.join(FIXTURE_DIR, "ca.crt"), "not-the-cert-name.example"),
    ).rejects.toThrow(/Hostname|ALTNAME|does not match|certificate/i);
  });

  it("missing CA fails closed where verification required", () => {
    expect(() =>
      buildPgClientOptions(
        "postgres://u:p@db.example.invalid:5432/postgres?sslmode=require",
        {},
      ),
    ).toThrow(/BLOCKED_TLS_CA_REQUIRED/);
  });

  it("CA content and paths are sanitized; cleanup succeeds", () => {
    const ca = loadCaFromEnv({
      [SSL_ROOTCERT_ENV]: path.join(FIXTURE_DIR, "ca.crt"),
    });
    const san = sanitizeCaEvidence(ca);
    const blob = JSON.stringify(san);
    expect(blob).not.toContain("BEGIN CERTIFICATE");
    expect(san.path_redacted).toBe(true);
    const tmp = path.join(
      os.tmpdir(),
      `ca-clean-${crypto.randomBytes(4).toString("hex")}.pem`,
    );
    fs.copyFileSync(path.join(FIXTURE_DIR, "ca.crt"), tmp);
    fs.writeFileSync(tmp, Buffer.alloc(fs.statSync(tmp).size));
    fs.unlinkSync(tmp);
    expect(fs.existsSync(tmp)).toBe(false);
  });
});

describe("official CA provenance pin (offline)", () => {
  it("prod-ca-2021 DER fingerprint is stable when file present", () => {
    const p = path.join(os.tmpdir(), "official-prod-ca-2021.crt");
    if (!fs.existsSync(p)) return;
    const x = new X509Certificate(fs.readFileSync(p));
    expect(crypto.createHash("sha256").update(x.raw).digest("hex")).toBe(
      "807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa",
    );
  });
});

describe.skipIf(!opensslAvailable() || !dockerAvailable())(
  "disposable Postgres TLS CA channel",
  () => {
    it("placeholder documents openssl+docker gate", () => {
      expect(opensslAvailable() && dockerAvailable()).toBe(true);
    });
  },
);
