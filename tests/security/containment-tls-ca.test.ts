/**
 * Mandatory TLS CA channel tests — zero skips.
 * Missing Docker/OpenSSL fails the gate explicitly (no describe.skipIf).
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import tls from "node:tls";
import { spawnSync } from "node:child_process";
import { Client } from "pg";
import {
  buildPgClientOptions,
  assertNoTlsBypass,
  sanitizeCaEvidence,
  classifyTlsError,
  loadCaFromEnv,
} from "../../scripts/security/containment-tls-ca.js";

const { SSL_ROOTCERT_ENV } =
  require("../../scripts/security/credential-browser-containment-constants.js");

const OFFICIAL_CA_DER =
  "807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa";
const OFFICIAL_CA_URL =
  "https://raw.githubusercontent.com/supabase/cli/develop/apps/cli-go/internal/gen/types/templates/prod-ca-2021.crt";

function resolveOpenSsl() {
  const candidates = [
    process.env.OPENSSL_BIN,
    "openssl",
    "C:\\Program Files\\Git\\usr\\bin\\openssl.exe",
    "C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe",
    "/usr/bin/openssl",
    "/opt/homebrew/bin/openssl",
  ].filter(Boolean);
  for (const bin of candidates) {
    const r = spawnSync(bin, ["version"], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (r.status === 0) return bin;
  }
  throw new Error(
    "MANDATORY_DEP_MISSING: OpenSSL is required for TLS containment tests (set OPENSSL_BIN or install openssl)",
  );
}

function requireDocker() {
  const r = spawnSync("docker", ["info"], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 30000,
  });
  if (r.status !== 0) {
    throw new Error(
      "MANDATORY_DEP_MISSING: Docker is required for disposable-Postgres TLS tests",
    );
  }
}

function ensureOfficialCa() {
  const p = path.join(os.tmpdir(), "official-prod-ca-2021.crt");
  if (!fs.existsSync(p) || fs.statSync(p).size < 100) {
    const r = spawnSync(
      "curl.exe",
      ["-sL", OFFICIAL_CA_URL, "-o", p, "-w", "%{http_code}"],
      { encoding: "utf8", windowsHide: true },
    );
    if ((r.stdout || "").trim() !== "200" || !fs.existsSync(p)) {
      throw new Error(
        "MANDATORY_DEP_MISSING: cannot fetch official Supabase prod-ca-2021.crt",
      );
    }
  }
  return p;
}

function openssl(bin, args) {
  const r = spawnSync(bin, args, { encoding: "utf8", windowsHide: true });
  if (r.status !== 0) {
    throw new Error(
      `openssl failed: ${args.join(" ")}\n${r.stderr || r.stdout || ""}`,
    );
  }
  return r;
}

function writeExt(dir, dnsNames, ipNames = []) {
  const sanParts = [
    ...dnsNames.map((d) => `DNS:${d}`),
    ...ipNames.map((ip) => `IP:${ip}`),
  ];
  if (sanParts.length === 0) {
    sanParts.push("DNS:localhost");
  }
  const san = sanParts.join(",");
  const p = path.join(dir, `ext-${crypto.randomBytes(2).toString("hex")}.cnf`);
  fs.writeFileSync(
    p,
    `[req]\ndistinguished_name=req\n[v3_ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n[v3_server]\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=${san}\n`,
  );
  return p;
}

function makeCa(bin, dir, name, days) {
  const key = path.join(dir, `${name}.key`);
  const crt = path.join(dir, `${name}.crt`);
  openssl(bin, ["genrsa", "-out", key, "2048"]);
  // OpenSSL 3.5 (Git for Windows) rejects combining -sha256 with -extfile on req.
  openssl(bin, [
    "req",
    "-x509",
    "-new",
    "-nodes",
    "-key",
    key,
    "-days",
    String(days),
    "-out",
    crt,
    "-subj",
    `/CN=${name}`,
  ]);
  return { key, crt };
}

function makeServer(bin, dir, ca, cn, dnsNames, ipNames = ["127.0.0.1"]) {
  const key = path.join(dir, `${cn}.key`);
  const csr = path.join(dir, `${cn}.csr`);
  const crt = path.join(dir, `${cn}.crt`);
  openssl(bin, ["genrsa", "-out", key, "2048"]);
  openssl(bin, [
    "req",
    "-new",
    "-key",
    key,
    "-out",
    csr,
    "-subj",
    `/CN=${cn}`,
  ]);
  openssl(bin, [
    "x509",
    "-req",
    "-in",
    csr,
    "-CA",
    ca.crt,
    "-CAkey",
    ca.key,
    "-CAcreateserial",
    "-out",
    crt,
    "-days",
    "2",
    "-extfile",
    writeExt(dir, dnsNames, ipNames),
    "-extensions",
    "v3_server",
  ]);
  try {
    fs.chmodSync(key, 0o600);
  } catch (_) {}
  return { key, crt };
}

function makeValidityWindowCas(dir) {
  const ps1 = path.join(__dirname, "helpers", "gen-validity-cas.ps1");
  if (!fs.existsSync(ps1)) {
    throw new Error(
      "MANDATORY_DEP_MISSING: tests/security/helpers/gen-validity-cas.ps1 not found",
    );
  }
  const r = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-File", ps1, "-OutDir", dir],
    { encoding: "utf8", windowsHide: true },
  );
  if (r.status !== 0) {
    throw new Error(
      `MANDATORY_DEP_MISSING: PowerShell CA validity fixture failed: ${r.stderr || r.stdout}`,
    );
  }
  const expired = path.join(dir, "expired-ca.crt");
  const future = path.join(dir, "future-ca.crt");
  if (!fs.existsSync(expired) || !fs.existsSync(future)) {
    throw new Error("MANDATORY_DEP_MISSING: validity CA PEMs not produced");
  }
  return { expired, future };
}

async function waitPgSsl(url, caPath, attempts = 90) {
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const opts = buildPgClientOptions(url, { [SSL_ROOTCERT_ENV]: caPath });
      const c = new Client({
        connectionString: opts.connectionString,
        ssl: opts.ssl,
      });
      await c.connect();
      await c.query("select 1");
      await c.end();
      return;
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(
    `disposable SSL postgres not ready: ${last && (last.code || last.message)}`,
  );
}

describe("containment-tls-ca policy (mandatory)", () => {
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

  it("missing CA fails closed before connection for non-loopback", () => {
    expect(() =>
      buildPgClientOptions(
        "postgres://u:p@aws-0-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require",
        {},
      ),
    ).toThrow(/BLOCKED_TLS_CA_REQUIRED/);
  });

  it("malformed CA fails before connection", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ca-mal-"));
    const bad = path.join(dir, "bad.pem");
    fs.writeFileSync(bad, "not-a-certificate\n");
    expect(() => loadCaFromEnv({ [SSL_ROOTCERT_ENV]: bad })).toThrow(
      /BLOCKED_TLS_CA_INVALID/,
    );
    expect(String(bad)).toContain("ca-mal-");
    try {
      loadCaFromEnv({ [SSL_ROOTCERT_ENV]: bad });
    } catch (e) {
      expect(String(e.message)).not.toContain(dir);
      expect(e.phase).toBe("tls_policy");
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("sanitized evidence never includes PEM or filesystem paths", () => {
    const bin = resolveOpenSsl();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ca-san-"));
    const ca = makeCa(bin, dir, "SanCA", 2);
    const loaded = loadCaFromEnv({ [SSL_ROOTCERT_ENV]: ca.crt });
    const san = sanitizeCaEvidence(loaded);
    const blob = JSON.stringify(san);
    expect(blob).not.toContain("BEGIN CERTIFICATE");
    expect(blob).not.toContain(dir);
    expect(san.path_redacted).toBe(true);
    expect(san.pinned).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("pins official Supabase CA DER fingerprint", () => {
    const p = ensureOfficialCa();
    const loaded = loadCaFromEnv({ [SSL_ROOTCERT_ENV]: p });
    expect(loaded.der_sha256).toBe(OFFICIAL_CA_DER);
  });
});

describe("disposable Postgres TLS CA channel (mandatory Docker+OpenSSL)", () => {
  let opensslBin;
  let dir;
  let goodCa;
  let goodCaBackup;
  let wrongCa;
  let expiredCaPath;
  let futureCaPath;
  let server;
  let mismatchServer;
  let container;
  let port;
  let url;

  beforeAll(async () => {
    requireDocker();
    opensslBin = resolveOpenSsl();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-tls-mandatory-"));
    goodCa = makeCa(opensslBin, dir, "GoodCA", 2);
    goodCaBackup = path.join(dir, "GoodCA.backup.crt");
    fs.copyFileSync(goodCa.crt, goodCaBackup);
    wrongCa = makeCa(opensslBin, dir, "WrongCA", 2);
    const validity = makeValidityWindowCas(dir);
    expiredCaPath = validity.expired;
    futureCaPath = validity.future;
    server = makeServer(opensslBin, dir, goodCa, "pg-local", [
      "localhost",
    ], ["127.0.0.1"]);
    mismatchServer = makeServer(
      opensslBin,
      dir,
      goodCa,
      "pg-mismatch",
      ["not-the-connect-host.example"],
      [],
    );

    port = String(58000 + Math.floor(Math.random() * 400));
    container = `cred-tls-m-${crypto.randomBytes(3).toString("hex")}`;

    const run = spawnSync(
      "docker",
      [
        "run",
        "-d",
        "--rm",
        "--name",
        container,
        "-e",
        "POSTGRES_PASSWORD=postgres",
        "-p",
        `${port}:5432`,
        "-v",
        `${dir}:/certs:ro`,
        "postgres:15-alpine",
        "sh",
        "-c",
        [
          "cp /certs/pg-local.crt /var/lib/postgresql/server.crt",
          "cp /certs/pg-local.key /var/lib/postgresql/server.key",
          "chown postgres:postgres /var/lib/postgresql/server.crt /var/lib/postgresql/server.key",
          "chmod 600 /var/lib/postgresql/server.key",
          "chmod 644 /var/lib/postgresql/server.crt",
          "exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/var/lib/postgresql/server.crt -c ssl_key_file=/var/lib/postgresql/server.key",
        ].join(" && "),
      ],
      { encoding: "utf8", windowsHide: true },
    );
    if (run.status !== 0) {
      throw new Error(run.stderr || run.stdout || "docker run failed");
    }

    url = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
    await waitPgSsl(url, goodCa.crt);
  }, 180000);

  afterAll(() => {
    if (container) {
      spawnSync("docker", ["rm", "-f", container], {
        stdio: "ignore",
        windowsHide: true,
      });
    }
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
  });

  it("correct CA and hostname reaches read-only query", async () => {
    const opts = buildPgClientOptions(url, { [SSL_ROOTCERT_ENV]: goodCa.crt });
    expect(opts.ssl.rejectUnauthorized).toBe(true);
    expect(opts.tls_evidence.mode).toBe("verify_full_explicit_ca");
    const c = new Client({
      connectionString: opts.connectionString,
      ssl: opts.ssl,
    });
    await c.connect();
    await c.query("SET default_transaction_read_only = on");
    const r = await c.query("select 1::int as n");
    expect(r.rows[0].n).toBe(1);
    await c.end();
  });

  it("wrong CA fails closed", async () => {
    const opts = buildPgClientOptions(url, { [SSL_ROOTCERT_ENV]: wrongCa.crt });
    const c = new Client({
      connectionString: opts.connectionString,
      ssl: opts.ssl,
    });
    await expect(c.connect()).rejects.toThrow(
      /SELF_SIGNED|unable to verify|certificate/i,
    );
  });

  it("missing CA fails before verified TLS connect on production-shaped host", () => {
    expect(() =>
      buildPgClientOptions(
        "postgres://u:p@db.example.invalid:5432/postgres?sslmode=require",
        {},
      ),
    ).toThrow(/BLOCKED_TLS_CA_REQUIRED/);
  });

  it("substituted path contents after pin cannot change trusted client bytes", async () => {
    const opts = buildPgClientOptions(url, { [SSL_ROOTCERT_ENV]: goodCa.crt });
    const pinned = opts._pinned_ca_der_sha256;
    fs.copyFileSync(wrongCa.crt, goodCa.crt);
    expect(opts._pinned_ca_der_sha256).toBe(pinned);
    const c = new Client({
      connectionString: opts.connectionString,
      ssl: opts.ssl,
    });
    await c.connect();
    await c.query("select 1");
    await c.end();
    fs.copyFileSync(goodCaBackup, goodCa.crt);
  });

  it("hostname mismatch fails TLS verification", async () => {
    const port2 = await new Promise((resolve, reject) => {
      const srv = tls.createServer(
        {
          key: fs.readFileSync(mismatchServer.key),
          cert: fs.readFileSync(mismatchServer.crt),
          minVersion: "TLSv1.2",
        },
        (s) => s.end("ok"),
      );
      srv.listen(0, "127.0.0.1", () =>
        resolve({ srv, port: srv.address().port }),
      );
      srv.on("error", reject);
    });
    await expect(
      new Promise((resolve, reject) => {
        const s = tls.connect(
          {
            host: "127.0.0.1",
            port: port2.port,
            servername: "localhost",
            rejectUnauthorized: true,
            ca: fs.readFileSync(goodCa.crt),
            checkServerIdentity: tls.checkServerIdentity,
            minVersion: "TLSv1.2",
          },
          () => {
            s.end();
            resolve("ok");
          },
        );
        s.on("error", reject);
      }),
    ).rejects.toThrow(/Hostname|ALTNAME|does not match|certificate/i);
    await new Promise((r) => port2.srv.close(r));
  });

  it("expired CA fails closed before connection", () => {
    expect(() =>
      loadCaFromEnv({ [SSL_ROOTCERT_ENV]: expiredCaPath }),
    ).toThrow(/BLOCKED_TLS_CA_EXPIRED/);
    try {
      loadCaFromEnv({ [SSL_ROOTCERT_ENV]: expiredCaPath });
    } catch (e) {
      expect(e.code).toBe("BLOCKED_TLS_CA_EXPIRED");
      expect(e.phase).toBe("tls_policy");
      expect(String(e.message)).not.toContain(dir);
      expect(String(e.message)).not.toContain("BEGIN CERTIFICATE");
    }
  });

  it("not-yet-valid CA fails closed before connection", () => {
    expect(() =>
      loadCaFromEnv({ [SSL_ROOTCERT_ENV]: futureCaPath }),
    ).toThrow(/BLOCKED_TLS_CA_NOT_YET_VALID/);
    try {
      loadCaFromEnv({ [SSL_ROOTCERT_ENV]: futureCaPath });
    } catch (e) {
      expect(e.code).toBe("BLOCKED_TLS_CA_NOT_YET_VALID");
      expect(e.phase).toBe("tls_policy");
    }
  });

  it("symlink and non-regular CA paths are rejected before connection", () => {
    expect(() => loadCaFromEnv({ [SSL_ROOTCERT_ENV]: dir })).toThrow(
      /BLOCKED_TLS_CA_NOT_FILE|BLOCKED_TLS_CA_UNREADABLE/,
    );

    const fsNative = require("node:fs");
    const origLstat = fsNative.lstatSync;
    const target = goodCa.crt;
    fsNative.lstatSync = (p, opts) => {
      if (path.resolve(String(p)) === path.resolve(target)) {
        return {
          isSymbolicLink: () => true,
          isFile: () => false,
          isDirectory: () => false,
          size: 100,
        };
      }
      return origLstat.call(fsNative, p, opts);
    };
    try {
      expect(() => loadCaFromEnv({ [SSL_ROOTCERT_ENV]: target })).toThrow(
        /BLOCKED_TLS_CA_SYMLINK/,
      );
    } finally {
      fsNative.lstatSync = origLstat;
    }
  });

  it("negative: no TLS bypass/CA/credential leakage in evidence or errors", () => {
    const opts = buildPgClientOptions(url, { [SSL_ROOTCERT_ENV]: goodCa.crt });
    const ev = JSON.stringify(opts.tls_evidence);
    expect(ev).not.toContain("BEGIN CERTIFICATE");
    expect(ev).not.toMatch(/password|postgres:postgres/i);
    expect(classifyTlsError({ code: "BLOCKED_TLS_CA_EXPIRED" })).toBe(
      "BLOCKED_TLS_CA_EXPIRED",
    );
    expect(() =>
      buildPgClientOptions(
        "postgres://u:secretdbpass@db.example.com/postgres?sslmode=no-verify",
        {},
      ),
    ).toThrow(/BLOCKED_TLS_BYPASS/);
  });
});
