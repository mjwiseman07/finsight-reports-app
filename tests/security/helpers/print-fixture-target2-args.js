"use strict";
/** Harness-only: print disposable fixture Target2 forward args (one per line). */
const {
  fixtureTarget2ForwardArgs,
} = require("./containment-applicator-sim.js");
process.stdout.write(fixtureTarget2ForwardArgs().join("\n"));
