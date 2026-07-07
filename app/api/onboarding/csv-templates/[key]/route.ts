import { NextResponse } from "next/server";
import { CSV_TEMPLATES, type CsvTemplateKey } from "@/lib/ap-intake/baseline-harvest/csv-templates";

export const dynamic = "force-static";

export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key: rawKey } = await ctx.params;
  const key = rawKey as CsvTemplateKey;
  const tpl = CSV_TEMPLATES[key];
  if (!tpl) return NextResponse.json({ error: "unknown template" }, { status: 404 });

  const body = tpl.headers.join(",") + "\n";
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${tpl.filename}"`,
    },
  });
}
