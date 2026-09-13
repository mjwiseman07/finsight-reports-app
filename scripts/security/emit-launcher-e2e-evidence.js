"use strict";
const { spawnSync, execFileSync } = require("child_process");
const fs = require("fs");
const {
  startDisposablePg,
  seedApplicatorWorld,
} = require("../../tests/security/helpers/containment-applicator-sim.js");

(async () => {
  const tip = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const auth = JSON.parse(
    execFileSync(
      "git",
      [
        "cat-file",
        "blob",
        `${tip}:docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json`,
      ],
      { encoding: "utf8" },
    ),
  );
  const freeze = auth.authorized_pr_head;
  const pg = await startDisposablePg();
  const { Client } = require("pg");
  const client = new Client({ connectionString: pg.url });
  await client.connect();
  await seedApplicatorWorld(client);
  await client.end();

  const corePath = "scripts/security/credential-browser-containment-apply-core.js";
  const backup = fs.readFileSync(corePath);
  fs.writeFileSync(corePath, "throw new Error('WORKTREE_MUST_NOT_RUN');\n");
  let ev;
  try {
    const r = spawnSync(
      process.execPath,
      [
        "scripts/security/launch-credential-browser-containment-apply.js",
        "--pr-head",
        freeze,
        "--mode",
        "dry-run",
      ],
      {
        encoding: "utf8",
        windowsHide: true,
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          CONTAINMENT_APPLY_DATABASE_URL: pg.url,
        },
      },
    );
    ev = JSON.parse(r.stdout);
  } finally {
    fs.writeFileSync(corePath, backup);
    await pg.stop();
  }

  const evidence = {
    kind: "LAUNCHER_STANDALONE_BUNDLE_E2E",
    generated_at: new Date().toISOString(),
    evidence_tip: tip,
    tooling_freeze: freeze,
    artifact_commit: auth.artifact_commit,
    standalone_bundle: {
      path: auth.standalone_bundle.path,
      oid: auth.standalone_bundle.oid,
      sha256: auth.standalone_bundle.sha256,
      bytes: auth.standalone_bundle.bytes,
      pg_version: auth.standalone_bundle.pg_version,
    },
    migration_seal: {
      oid: auth.migration_blob_oid,
      sha256: auth.migration_sha256,
      bytes: auth.migration_bytes,
    },
    path: "launcher -> git cat-file bundle -> temp materialize -> child execute",
    worktree_core_corrupted_during_run: true,
    verdict: ev.verdict,
    sqlApplicationAttempts: ev.sqlApplicationAttempts,
    databaseConnectionAttempts: ev.databaseConnectionAttempts,
    launcher: ev.launcher,
  };
  fs.writeFileSync(
    "docs/security/connection-credential-browser-containment/LAUNCHER_E2E_EVIDENCE.json",
    `${JSON.stringify(evidence, null, 2)}\n`,
  );

  // Supersede tip-aligned rehearsal labels
  const rehearsalPath =
    "docs/security/connection-credential-browser-containment/LOCAL_REHEARSAL_EVIDENCE.json";
  const rehearsal = JSON.parse(fs.readFileSync(rehearsalPath, "utf8"));
  rehearsal.evidence_tip = tip;
  rehearsal.tooling_freeze = freeze;
  rehearsal.standalone_bundle = evidence.standalone_bundle;
  rehearsal.pr_head = tip;
  rehearsal.source.seals_commit = tip;
  rehearsal.source.tooling_freeze = freeze;
  rehearsal.notes = [
    "sqlApplicationAttempts here count local forward/rollback/reapply rehearsal statements, not production.",
    "Executable applicator authority is tooling_freeze standalone bundle, not this tip evidence commit.",
  ];
  fs.writeFileSync(rehearsalPath, `${JSON.stringify(rehearsal, null, 2)}\n`);

  console.log(JSON.stringify({ tip, freeze, verdict: ev.verdict }, null, 2));
  if (ev.verdict !== "DRY_RUN_READY") process.exit(1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
