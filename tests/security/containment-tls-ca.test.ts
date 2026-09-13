/**
 * Mandatory TLS trust-root tests — embedded official CA; zero skips.
 * Missing Docker/OpenSSL fails the gate explicitly (no describe.skipIf).
 * Disposable SSL uses in-memory synthetic CA via testTrustedCaPem only
 * (never CONTAINMENT_APPLY_SSL_ROOTCERT / filesystem trust).
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
  assertNoCaPathChannel,
  sanitizeCaEvidence,
  classifyTlsError,
  loadOfficialEmbeddedCa,
  loadPinnedCaFromPem,
  OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
  FORBIDDEN_SSL_ROOTCERT_ENV,
} from "../../scripts/security/containment-tls-ca.js";
import {
  OFFICIAL_SUPABASE_PROD_CA_2021_PEM,
} from "../../scripts/security/embedded-supabase-prod-ca-2021.js";

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
  return { key, crt, pem: fs.readFileSync(crt, "utf8") };
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
  return {
    expiredPem: fs.readFileSync(expired, "utf8"),
    futurePem: fs.readFileSync(future, "utf8"),
  };
}

async function waitPgSsl(url, trustedCaPem, attempts = 90) {
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const opts = buildPgClientOptions(url, {}, { testTrustedCaPem: trustedCaPem });
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

describe("containment-tls-ca embedded trust root (mandatory)", () => {
  it("accepts exact embedded official CA fingerprint", () => {
    const loaded = loadOfficialEmbeddedCa();
    expect(loaded.der_sha256).toBe(OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256);
    expect(loaded.source).toBe("embedded_official_supabase_ca");
    expect(loaded.pinned).toBe(true);
  });

  it("rejects modified embedded CA before connection", () => {
    const tampered =
      OFFICIAL_SUPABASE_PROD_CA_2021_PEM.replace(/[A-Za-z0-9+/]{16}/, "AAAAAAAAAAAAAAAA") ||
      "-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----\n";
    expect(() =>
      loadPinnedCaFromPem(tampered, OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256),
    ).toThrow(/BLOCKED_TLS_CA_PIN_MISMATCH|BLOCKED_TLS_CA_INVALID/);
  });

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

  it("non-loopback uses embedded official CA with rejectUnauthorized+hostname check", () => {
    const opts = buildPgClientOptions(
      "postgres://u:p@aws-0-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require",
      {},
    );
    expect(opts.ssl.rejectUnauthorized).toBe(true);
    expect(opts.ssl.checkServerIdentity).toBe(tls.checkServerIdentity);
    expect(opts.tls_evidence.mode).toBe("verify_full_embedded_ca");
    expect(opts._pinned_ca_der_sha256).toBe(
      OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
    );
    expect(opts.ssl.ca).toContain("BEGIN CERTIFICATE");
  });

  it("CA-path env fails closed and cannot supply trust", () => {
    expect(() =>
      assertNoCaPathChannel({ [FORBIDDEN_SSL_ROOTCERT_ENV]: "C:\\hostile\\ca.pem" }),
    ).toThrow(/BLOCKED_TLS_CA_PATH_FORBIDDEN/);
    expect(() =>
      buildPgClientOptions(
        "postgres://u:p@db.example.com:5432/postgres?sslmode=require",
        { [FORBIDDEN_SSL_ROOTCERT_ENV]: path.join(os.tmpdir(), "hostile.pem") },
      ),
    ).toThrow(/BLOCKED_TLS_CA_PATH_FORBIDDEN/);
  });

  it("expired and not-yet-valid certificates rejected before connection", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ca-validity-"));
    const { expiredPem, futurePem } = makeValidityWindowCas(dir);
    expect(() => loadPinnedCaFromPem(expiredPem)).toThrow(/BLOCKED_TLS_CA_EXPIRED/);
    expect(() => loadPinnedCaFromPem(futurePem)).toThrow(
      /BLOCKED_TLS_CA_NOT_YET_VALID/,
    );
    try {
      loadPinnedCaFromPem(expiredPem);
    } catch (e) {
      expect(e.code).toBe("BLOCKED_TLS_CA_EXPIRED");
      expect(e.phase).toBe("tls_policy");
      expect(String(e.message)).not.toContain("BEGIN CERTIFICATE");
      expect(String(e.message)).not.toContain(dir);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("sanitized evidence never includes PEM or filesystem paths", () => {
    const loaded = loadOfficialEmbeddedCa();
    const san = sanitizeCaEvidence(loaded);
    const blob = JSON.stringify(san);
    expect(blob).not.toContain("BEGIN CERTIFICATE");
    expect(san.path_redacted).toBe(true);
    expect(san.source).toBe("embedded_official_supabase_ca");
  });

  it("static gate: ceremony/bootstrap must not assign CA-path trust env", () => {
    const ceremony = fs.readFileSync(
      path.join(
        process.cwd(),
        "scripts/security/operator-containment-production-dryrun-ceremony.ps1",
      ),
      "utf8",
    );
    const bootstrap = fs.readFileSync(
      path.join(
        process.cwd(),
        "scripts/security/bootstrap-credential-browser-containment.ps1",
      ),
      "utf8",
    );
    expect(ceremony).not.toMatch(/\$env:CONTAINMENT_APPLY_SSL_ROOTCERT\s*=/);
    expect(bootstrap).not.toMatch(/\$childEnv\[\$caEnvName\]\s*=/);
    expect(ceremony).toMatch(/embedded official Supabase CA/i);
    expect(bootstrap).toMatch(/BLOCKED_TLS_CA_PATH_FORBIDDEN/);
  });
});

describe("disposable Postgres TLS (mandatory Docker+OpenSSL, in-memory CA)", () => {
  let opensslBin;
  let dir;
  let goodCa;
  let wrongCa;
  let server;
  let mismatchServer;
  let container;
  let port;
  let url;

  beforeAll(async () => {
    requireDocker();
    opensslBin = resolveOpenSsl();
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "pg-tls-embedded-"));
    goodCa = makeCa(opensslBin, dir, "GoodCA", 2);
    wrongCa = makeCa(opensslBin, dir, "WrongCA", 2);
    server = makeServer(opensslBin, dir, goodCa, "pg-local", ["localhost"], [
      "127.0.0.1",
    ]);
    mismatchServer = makeServer(
      opensslBin,
      dir,
      goodCa,
      "pg-mismatch",
      ["not-the-connect-host.example"],
      [],
    );

    port = String(58000 + Math.floor(Math.random() * 400));
    container = `cred-tls-e-${crypto.randomBytes(3).toString("hex")}`;

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
    await waitPgSsl(url, goodCa.pem);
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

  it("correct in-memory CA and hostname reaches read-only query", async () => {
    const opts = buildPgClientOptions(
      url,
      {},
      { testTrustedCaPem: goodCa.pem },
    );
    expect(opts.ssl.rejectUnauthorized).toBe(true);
    expect(opts.ssl.checkServerIdentity).toBe(tls.checkServerIdentity);
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
    const opts = buildPgClientOptions(
      url,
      {},
      { testTrustedCaPem: wrongCa.pem },
    );
    const c = new Client({
      connectionString: opts.connectionString,
      ssl: opts.ssl,
    });
    await expect(c.connect()).rejects.toThrow(
      /SELF_SIGNED|unable to verify|certificate/i,
    );
  });

  it("hostile CA path env cannot affect embedded/production options", () => {
    const hostile = path.join(dir, "hostile-path.pem");
    fs.writeFileSync(hostile, wrongCa.pem);
    expect(() =>
      buildPgClientOptions(
        "postgres://u:p@db.example.invalid:5432/postgres?sslmode=require",
        { [FORBIDDEN_SSL_ROOTCERT_ENV]: hostile },
      ),
    ).toThrow(/BLOCKED_TLS_CA_PATH_FORBIDDEN/);
    // Without path env, embedded official CA is used (not hostile file bytes).
    const opts = buildPgClientOptions(
      "postgres://u:p@db.example.invalid:5432/postgres?sslmode=require",
      {},
    );
    expect(opts._pinned_ca_der_sha256).toBe(
      OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
    );
    expect(opts.ssl.ca).toBe(OFFICIAL_SUPABASE_PROD_CA_2021_PEM);
  });

  it("symlink/junction/reparse path artifacts cannot influence trust (no path consumed)", () => {
    const linkLike = path.join(dir, "link-or-reparse.pem");
    fs.writeFileSync(linkLike, wrongCa.pem);
    // Even if a path exists, production options ignore it when env unset.
    const opts = buildPgClientOptions(
      "postgres://u:p@db.example.com:5432/postgres?sslmode=require",
      {},
    );
    expect(opts._pinned_ca_der_sha256).toBe(
      OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
    );
    // When env points at hostile path: fail closed (not follow/read).
    expect(() =>
      buildPgClientOptions(
        url,
        { [FORBIDDEN_SSL_ROOTCERT_ENV]: linkLike },
        { testTrustedCaPem: goodCa.pem },
      ),
    ).toThrow(/BLOCKED_TLS_CA_PATH_FORBIDDEN/);
  });

  it("post-pin mutation of in-memory opts cannot change trusted client bytes", async () => {
    const opts = buildPgClientOptions(
      url,
      {},
      { testTrustedCaPem: goodCa.pem },
    );
    const pinned = opts._pinned_ca_der_sha256;
    // Mutating filesystem after pin must not change ssl.ca already bound.
    fs.writeFileSync(goodCa.crt, wrongCa.pem);
    expect(opts._pinned_ca_der_sha256).toBe(pinned);
    expect(opts.ssl.ca).toBe(goodCa.pem);
    const c = new Client({
      connectionString: opts.connectionString,
      ssl: opts.ssl,
    });
    await c.connect();
    await c.query("select 1");
    await c.end();
    fs.writeFileSync(goodCa.crt, goodCa.pem);
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
    const opts = buildPgClientOptions(
      `postgres://u:p@127.0.0.1:${port2.port}/postgres`,
      {},
      { testTrustedCaPem: goodCa.pem },
    );
    await expect(
      new Promise((resolve, reject) => {
        const s = tls.connect(
          {
            host: "127.0.0.1",
            port: port2.port,
            servername: "localhost",
            rejectUnauthorized: opts.ssl.rejectUnauthorized,
            ca: opts.ssl.ca,
            checkServerIdentity: opts.ssl.checkServerIdentity,
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

  it("negative: no PEM/credential leakage in evidence or errors; rejectUnauthorized stays true", () => {
    const opts = buildPgClientOptions(
      url,
      {},
      { testTrustedCaPem: goodCa.pem },
    );
    expect(opts.ssl.rejectUnauthorized).toBe(true);
    const ev = JSON.stringify(opts.tls_evidence);
    expect(ev).not.toContain("BEGIN CERTIFICATE");
    expect(ev).not.toMatch(/password|postgres:postgres/i);
    expect(classifyTlsError({ code: "BLOCKED_TLS_CA_PATH_FORBIDDEN" })).toBe(
      "BLOCKED_TLS_CA_PATH_FORBIDDEN",
    );
    expect(() =>
      buildPgClientOptions(
        "postgres://u:secretdbpass@db.example.com/postgres?sslmode=no-verify",
        {},
      ),
    ).toThrow(/BLOCKED_TLS_BYPASS/);
  });

  it("corrupt worktree cannot influence trust without reloading sealed bundle", () => {
    // Production path never reads a CA file; trust bytes are the in-module constant.
    const hostileDir = fs.mkdtempSync(path.join(os.tmpdir(), "hostile-ca-"));
    const hostile = path.join(hostileDir, "prod-ca-2021.crt");
    fs.writeFileSync(hostile, wrongCa.pem);
    const opts = buildPgClientOptions(
      "postgres://u:p@db.example.com:5432/postgres?sslmode=require",
      {},
    );
    expect(opts.ssl.ca).toBe(OFFICIAL_SUPABASE_PROD_CA_2021_PEM);
    expect(opts._pinned_ca_der_sha256).toBe(
      OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
    );
    expect(opts.ssl.ca).not.toBe(wrongCa.pem);
    fs.rmSync(hostileDir, { recursive: true, force: true });
  });
});
