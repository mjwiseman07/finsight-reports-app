const fs = require("fs");
const path = require("path");

function walk(dir, fix) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, fix);
    else if (e.name.endsWith(".ts")) fix(p);
  }
}

function fixDoctrineImport(file) {
  let s = fs.readFileSync(file, "utf8");
  const rel = path.relative(path.join("lib", "intelligence", "synthetic"), file).replace(/\\/g, "/");
  const depth = rel.split("/").length - 1;
  const correct = `${"../".repeat(depth)}standards/doctrine/containsProfessionalEngagementData`;
  const wrong = "../../standards/doctrine/containsProfessionalEngagementData";
  if (s.includes(wrong) && !s.includes(correct)) {
    fs.writeFileSync(file, s.split(wrong).join(correct));
    console.log("fixed doctrine", file, depth);
  }
}

walk("lib/intelligence/synthetic/industry/prof-services", fixDoctrineImport);
walk("lib/intelligence/synthetic/libraries/prof-services", fixDoctrineImport);

const patches = [
  [
    "lib/intelligence/synthetic/industry/prof-services/framework-router/index.ts",
    "../../libraries/prof-services/handles",
    "../../../libraries/prof-services/handles",
  ],
  [
    "lib/intelligence/synthetic/industry/prof-services/audit/ps-audit-emitter.ts",
    "../../audit/channels/engagement-letter-audit",
    "../../../audit/channels/engagement-letter-audit",
  ],
];

for (const [file, from, to] of patches) {
  let s = fs.readFileSync(file, "utf8");
  if (s.includes(from)) {
    fs.writeFileSync(file, s.replace(from, to));
    console.log("fixed import", file);
  }
}
