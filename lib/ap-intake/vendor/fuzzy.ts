export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = a.length;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

// Single Metaphone (Lawrence Philips, 1990). Sufficient for phonetic bucketing.
export function metaphone(input: string): string {
  const s = input.toUpperCase().replace(/[^A-Z]/g, "");
  if (!s) return "";
  let i = 0;
  const out: string[] = [];
  const len = s.length;
  const isVowel = (c: string) => "AEIOU".includes(c);

  if (
    s.startsWith("AE") ||
    s.startsWith("GN") ||
    s.startsWith("KN") ||
    s.startsWith("PN") ||
    s.startsWith("WR")
  ) {
    i = 1;
  }
  if (s.startsWith("X")) {
    out.push("S");
    i = 1;
  }
  if (s.startsWith("WH")) {
    out.push("W");
    i = 2;
  }

  while (i < len && out.length < 12) {
    const c = s[i];
    const next = s[i + 1] ?? "";
    const prev = s[i - 1] ?? "";
    if (c === prev && c !== "C") {
      i++;
      continue;
    }
    switch (c) {
      case "A":
      case "E":
      case "I":
      case "O":
      case "U":
        if (i === 0) out.push(c);
        break;
      case "B":
        out.push("B");
        if (i === len - 1 && prev === "M") out.pop();
        break;
      case "C":
        if (next === "H") {
          out.push("X");
          i++;
        } else if (next === "I" && s[i + 2] === "A") {
          out.push("X");
        } else if (/[IEY]/.test(next)) {
          out.push("S");
        } else {
          out.push("K");
        }
        break;
      case "D":
        if (next === "G" && /[IEY]/.test(s[i + 2] ?? "")) {
          out.push("J");
          i += 2;
        } else {
          out.push("T");
        }
        break;
      case "F":
        out.push("F");
        break;
      case "G":
        if (next === "H") {
          if (i > 0 && !isVowel(prev)) {
            /* silent */
          } else out.push("F");
          i++;
        } else if (next === "N") {
          /* silent */
        } else if (/[IEY]/.test(next)) {
          out.push("J");
        } else {
          out.push("K");
        }
        break;
      case "H":
        if (isVowel(prev) && !isVowel(next)) {
          /* silent */
        } else {
          out.push("H");
        }
        break;
      case "J":
        out.push("J");
        break;
      case "K":
        if (prev !== "C") out.push("K");
        break;
      case "L":
        out.push("L");
        break;
      case "M":
        out.push("M");
        break;
      case "N":
        out.push("N");
        break;
      case "P":
        if (next === "H") {
          out.push("F");
          i++;
        } else out.push("P");
        break;
      case "Q":
        out.push("K");
        break;
      case "R":
        out.push("R");
        break;
      case "S":
        if (next === "H") {
          out.push("X");
          i++;
        } else if (next === "I" && (s[i + 2] === "O" || s[i + 2] === "A")) {
          out.push("X");
        } else {
          out.push("S");
        }
        break;
      case "T":
        if (next === "H") {
          out.push("0");
          i++;
        } else if (next === "I" && (s[i + 2] === "O" || s[i + 2] === "A")) {
          out.push("X");
        } else {
          out.push("T");
        }
        break;
      case "V":
        out.push("F");
        break;
      case "W":
        if (isVowel(next)) out.push("W");
        break;
      case "X":
        out.push("K");
        out.push("S");
        break;
      case "Y":
        if (isVowel(next)) out.push("Y");
        break;
      case "Z":
        out.push("S");
        break;
    }
    i++;
  }
  return out.join("");
}
