import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // MEM-LIFECYCLE Block 4: forbid direct pilot_slots mutations outside SSOT.
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    ignores: [
      "lib/pilot-lifecycle/**",
      "supabase/migrations/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "tests/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.callee.property.name='from'][callee.object.arguments.0.value='pilot_slots'][callee.property.name=/^(upsert|insert|update|delete)$/]",
          message:
            "Direct pilot_slots mutations are forbidden. Use lib/pilot-lifecycle/ SSOT (recordCreation / recordTransition / recordAssertionEvidence) or writePilotSlotAndEventAtomic.",
        },
      ],
    },
  },
]);

export default eslintConfig;
