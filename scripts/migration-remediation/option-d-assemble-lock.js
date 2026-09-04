/**
 * Cross-process lock for Option D assemble/audit so parallel vitest files
 * do not wipe assembled/ mid-read.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function pidAlive(pid) {
  const n = Number(pid);
  if (!Number.isFinite(n) || n <= 0) return false;
  try {
    process.kill(n, 0);
    return true;
  } catch (err) {
    return Boolean(err && err.code === "EPERM");
  }
}

function withAssembleLock(fn) {
  const lockPath = path.join(os.tmpdir(), "finsight-option-d-assemble.lock");
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    try {
      fs.writeFileSync(lockPath, `${process.pid}\n`, { flag: "wx" });
      try {
        return fn();
      } finally {
        try {
          fs.unlinkSync(lockPath);
        } catch (err) {
          if (err && err.code !== "ENOENT") throw err;
        }
      }
    } catch (err) {
      if (!err || err.code !== "EEXIST") throw err;
      try {
        const holder = fs.readFileSync(lockPath, "utf8").trim().split(/\s+/)[0];
        if (!pidAlive(holder)) {
          try {
            fs.unlinkSync(lockPath);
            continue;
          } catch (unlinkErr) {
            if (!unlinkErr || unlinkErr.code !== "ENOENT") {
              /* retry */
            }
          }
        }
      } catch {
        /* retry */
      }
      sleepMs(50);
    }
  }
  throw new Error("timeout waiting for Option D assemble lock");
}

module.exports = { withAssembleLock };
