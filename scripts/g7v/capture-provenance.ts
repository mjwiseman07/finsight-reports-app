export type ProvenanceTap = {
  coverage: (disclosure: unknown) => number;
  citationResolution: (disclosure: unknown) => number;
  graph: () => unknown;
};

export function captureProvenance(): ProvenanceTap {
  return {
    coverage(disclosure: unknown): number {
      const figures = extractFigures(disclosure);
      if (figures.length === 0) return 1.0;
      const linked = figures.filter((f) => hasProvenance(f)).length;
      return linked / figures.length;
    },
    citationResolution(disclosure: unknown): number {
      const citations = extractCitations(disclosure);
      if (citations.length === 0) return 1.0;
      const resolved = citations.filter((c) => citationResolves(c)).length;
      return resolved / citations.length;
    },
    graph() {
      return {};
    },
  };
}

function extractFigures(disclosure: unknown): unknown[] {
  const figures: unknown[] = [];
  function walk(node: unknown) {
    if (node == null) return;
    if (typeof node === "object") {
      if (!Array.isArray(node)) {
        const obj = node as Record<string, unknown>;
        if ("value" in obj && typeof obj.value === "number") figures.push(node);
        else if ("amount" in obj && typeof obj.amount === "number") figures.push(node);
        for (const v of Object.values(obj)) walk(v);
      } else {
        for (const v of node) walk(v);
      }
    }
  }
  walk(disclosure);
  return figures;
}

function hasProvenance(figure: unknown): boolean {
  if (typeof figure !== "object" || figure == null) return false;
  const obj = figure as Record<string, unknown>;
  return !!(obj.source || obj.ref || obj.provenance || obj.sourceRow);
}

function extractCitations(disclosure: unknown): unknown[] {
  const citations: unknown[] = [];
  function walk(node: unknown) {
    if (node == null) return;
    if (typeof node === "object") {
      if (!Array.isArray(node)) {
        const obj = node as Record<string, unknown>;
        if ("citation" in obj || "cite" in obj) citations.push(node);
        for (const v of Object.values(obj)) walk(v);
      } else {
        for (const v of node) walk(v);
      }
    }
  }
  walk(disclosure);
  return citations;
}

function citationResolves(citation: unknown): boolean {
  if (typeof citation !== "object" || citation == null) return false;
  const obj = citation as Record<string, unknown>;
  const c = obj.citation ?? obj.cite ?? citation;
  if (!c) return false;
  if (typeof c === "string") return c.trim().length > 0;
  if (typeof c === "object" && c != null) {
    const cite = c as Record<string, unknown>;
    return !!(cite.paragraph || cite.paragraphs || cite.section || cite.standard);
  }
  return false;
}
