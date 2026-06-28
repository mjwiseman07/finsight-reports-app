#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const schemaPath = path.join(root, "schemas/register.schema.json");
const registerPath = path.join(root, "reports/g7-gap-register.json");

const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const register = JSON.parse(fs.readFileSync(registerPath, "utf8"));

const schemaVersion = schema.version ?? "1.2.0";
const registerVersion = register.schemaVersion ?? "unknown";

if (registerVersion !== schemaVersion) {
  console.error(`FAIL schemaVersion mismatch: register=${registerVersion} schema=${schemaVersion}`);
  process.exit(1);
}

console.log(`schemaVersion: v${schemaVersion}`);
process.exit(0);
