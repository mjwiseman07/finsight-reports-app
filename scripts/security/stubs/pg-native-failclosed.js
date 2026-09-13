// Sealed fail-closed stub: pg-native must never resolve externally in the applicator bundle.
"use strict";
const err = new Error(
  "PG_NATIVE_DISABLED: sealed containment applicator forbids pg-native resolution",
);
err.code = "PG_NATIVE_DISABLED";
throw err;
