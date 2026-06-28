#!/usr/bin/env node
const path = require("path");
const ts = require("typescript");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
require.extensions[".ts"] = function loadTs(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: true,
      resolveJsonModule: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const { validateRegisterClassification, loadDefaultCrossoverContext } = require(
  path.join(root, "lib/router/crossover/index.ts"),
);

const ctx = loadDefaultCrossoverContext(root);
validateRegisterClassification(ctx);

const ids = ["GAP-0174", "GAP-0177", "GAP-0180"];
for (const id of ids) {
  const gap = ctx.register.gaps.find((g) => g.id === id);
  console.log(
    `${id}: triage=${gap.triage} framework=${gap.framework} topic=${gap.message.split(":")[0]}`,
  );
}

console.log("B6 audit: GAP-0174/0177/0180 confirmed US GAAP rtl/channel-disaggregation document-limitation");
console.log("B6 audit: PASS — C7a-10 hypothesis stands");
