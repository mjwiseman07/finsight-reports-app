#!/usr/bin/env node
/**
 * Rigorous PostgreSQL array-text parsing for Option D preflight.
 *
 * Accepts:
 *   - native JavaScript 1-D string arrays
 *   - PostgreSQL array text literals such as "{bucket_id}" / "{\"a\",\"b,c\"}"
 *
 * Fail-closed on: null input, non-array/non-string, multidimensional arrays,
 * nested structures, unquoted NULL elements (for constraint column lists),
 * malformed braces/quotes/escapes, trailing garbage.
 *
 * Does NOT use naive comma splitting.
 */
function fail(rule, detail, extra = {}) {
  return { ok: false, rule, detail, columns: null, ...extra };
}

function success(columns) {
  return { ok: true, rule: null, detail: null, columns };
}

/**
 * Parse a PostgreSQL 1-D text array literal.
 * @param {unknown} input
 * @param {{ allowNullElements?: boolean }} [opts]
 */
function parsePostgresTextArray(input, opts = {}) {
  const allowNullElements = opts.allowNullElements === true;

  if (input == null) {
    return fail("pg_array_null_input", "Array value is null/undefined");
  }

  if (Array.isArray(input)) {
    for (let i = 0; i < input.length; i++) {
      const el = input[i];
      if (Array.isArray(el)) {
        return fail("pg_array_multidimensional", "Native array contains nested array element", {
          index: i,
        });
      }
      if (el === null || el === undefined) {
        if (!allowNullElements) {
          return fail("pg_array_null_element", "Null element not allowed in constraint column lists", {
            index: i,
          });
        }
        continue;
      }
      if (typeof el !== "string") {
        return fail("pg_array_unexpected_element_type", "Native array element must be string", {
          index: i,
          typeofElement: typeof el,
        });
      }
    }
    return success(input.map((el) => (el == null ? null : String(el))));
  }

  if (typeof input !== "string") {
    return fail("pg_array_unexpected_type", "Expected string or array", {
      typeofInput: typeof input,
    });
  }

  const s = input;
  if (s.length < 2 || s[0] !== "{" || s[s.length - 1] !== "}") {
    return fail("pg_array_malformed_braces", "Array text must be wrapped in { }");
  }

  // Reject explicit multidimensional opener after first brace content start patterns like {{
  // Handled during scan when '{' appears outside quotes.

  const body = s.slice(1, -1);
  if (body.length === 0) {
    return success([]);
  }

  const columns = [];
  let i = 0;
  let cur = "";
  let inQuotes = false;
  let sawQuoted = false;

  const pushElement = () => {
    if (!sawQuoted && cur.length === 0) {
      return fail("pg_array_empty_element", "Empty unquoted element is malformed");
    }
    if (!sawQuoted && cur.toUpperCase() === "NULL") {
      if (!allowNullElements) {
        return fail(
          "pg_array_null_element",
          "Unquoted NULL element not allowed in constraint column lists",
        );
      }
      columns.push(null);
    } else {
      columns.push(cur);
    }
    cur = "";
    sawQuoted = false;
    return null;
  };

  while (i < body.length) {
    const ch = body[i];

    if (inQuotes) {
      if (ch === "\\") {
        if (i + 1 >= body.length) {
          return fail("pg_array_truncated_escape", "Trailing backslash in quoted element");
        }
        cur += body[i + 1];
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        i += 1;
        continue;
      }
      cur += ch;
      i += 1;
      continue;
    }

    // outside quotes
    if (ch === '"') {
      if (cur.length > 0) {
        return fail("pg_array_malformed_quote", "Quote starts after unquoted characters");
      }
      inQuotes = true;
      sawQuoted = true;
      i += 1;
      continue;
    }
    if (ch === "{") {
      return fail(
        "pg_array_multidimensional",
        "Nested '{' indicates multidimensional or unexpected array structure",
      );
    }
    if (ch === "}") {
      return fail("pg_array_malformed_braces", "Unexpected '}' inside array body");
    }
    if (ch === ",") {
      const err = pushElement();
      if (err) return err;
      i += 1;
      continue;
    }
    // whitespace outside quotes is not part of PG array element names in our literals;
    // standard pg doesn't emit spaces outside quotes between tokens except after commas sometimes.
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      // allow insignificant whitespace only between elements (after comma / before next)
      if (cur.length > 0 || sawQuoted) {
        return fail("pg_array_unexpected_whitespace", "Whitespace inside unquoted element");
      }
      i += 1;
      continue;
    }
    cur += ch;
    i += 1;
  }

  if (inQuotes) {
    return fail("pg_array_unclosed_quote", "Unclosed double quote in array text");
  }

  const err = pushElement();
  if (err) return err;
  return success(columns);
}

/**
 * Normalize constraint column lists from pg driver (array or array-text).
 */
function normalizePgArrayColumns(raw, opts = {}) {
  const parsed = parsePostgresTextArray(raw, opts);
  if (!parsed.ok) {
    return parsed;
  }
  // Constraint column names must be non-empty strings
  for (let i = 0; i < parsed.columns.length; i++) {
    const c = parsed.columns[i];
    if (typeof c !== "string" || c.length === 0) {
      return fail("pg_array_invalid_column_name", "Constraint column entry must be non-empty string", {
        index: i,
        value: c,
      });
    }
  }
  return parsed;
}

module.exports = {
  parsePostgresTextArray,
  normalizePgArrayColumns,
};
