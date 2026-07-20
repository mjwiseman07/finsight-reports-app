// Note: pdfjs-dist is imported lazily inside extractTextFromBuffer's PDF branch
// so non-PDF uploads (xlsx, docx, eml, txt) don't pay the pdfjs init cost.
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { simpleParser } from 'mailparser';
import { createServiceClient } from '@/lib/supabase/service';
import { invokeBedrock } from './bedrock-client';
import { checkEngagementCap, logUsage } from './llm-usage';
import { redactPii, encryptRedactionMap } from './pii-redaction';
import { classifyAssertions } from './assertion-classifier';

export interface ParsedPbcRequest {
  request_number: string;
  request_description: string;
  requested_by?: string;
  assertion_tags: string[];
  source_account_hint?: string;
  due_date?: string;
}

export interface ParsePbcOptions {
  engagementId: string;
  uploadId: string;
  calledByUserId: string;
  storagePath: string;
  contentType: string;
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  if (contentType === 'application/pdf') {
    // Use pdfjs-dist "legacy" build — Mozilla's officially-supported Node
    // bundle. Self-shims DOMMatrix/ImageData/Path2D. We avoid pdf-parse
    // entirely because:
    //   - pdf-parse@2 crashes at module-load on Vercel Lambda (DOMMatrix)
    //   - pdf-parse@1 (vendored pdfjs@1.9) throws "bad XRef entry" on valid
    //     PDFs under modern Node V8 buffer semantics
    //
    // pdfjs's Node "fake worker" (LoopbackPort — no thread spawn) still
    // needs to import pdf.worker.mjs to get the WorkerMessageHandler.
    // The default workerSrc = "./pdf.worker.mjs" is unresolvable on Vercel
    // Lambda because serverExternalPackages excludes pdfjs-dist from
    // outputFileTracing, so the worker file is never copied into
    // /var/task/node_modules. We vendor pdf.worker.mjs into the app itself
    // (lib/audit-ready/vendor/pdf.worker.mjs) so it's ALWAYS in the Lambda
    // bundle, and reference it via new URL(..., import.meta.url) which
    // Next.js and Turbopack both recognize as a first-class asset reference.
    const { fileURLToPath } = await import('node:url');
    const workerUrl = new URL('./vendor/pdf.worker.mjs', import.meta.url);
    const workerSrc = fileURLToPath(workerUrl);

    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

    const data = new Uint8Array(buffer);
    const doc = await pdfjs.getDocument({
      data,
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
      useWorkerFetch: false,
    }).promise;
    try {
      const pageTexts: string[] = [];
      for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum);
        try {
          const content = await page.getTextContent();
          const text = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ');
          pageTexts.push(text);
        } finally {
          page.cleanup();
        }
      }
      return pageTexts.join('\n\n');
    } finally {
      await doc.cleanup();
      await doc.destroy();
    }
  }

  if (
    contentType ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    contentType === 'application/vnd.ms-excel'
  ) {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheets = wb.SheetNames.map((name) => {
      const sheet = wb.Sheets[name];
      return `# Sheet: ${name}\n${XLSX.utils.sheet_to_csv(sheet)}`;
    });
    return sheets.join('\n\n');
  }

  if (
    contentType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    contentType === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (contentType === 'message/rfc822') {
    const parsed = await simpleParser(buffer);
    return `Subject: ${parsed.subject ?? ''}\nFrom: ${parsed.from?.text ?? ''}\n\n${parsed.text ?? ''}`;
  }

  if (contentType === 'text/plain') {
    return buffer.toString('utf-8');
  }

  throw new Error(`unsupported_content_type:${contentType}`);
}

/**
 * Parse a PBC upload end-to-end: extract → redact → Bedrock → classify → insert.
 */
export async function parsePbcUpload(opts: ParsePbcOptions): Promise<{
  requestsExtracted: number;
  totalCostCents: number;
  modelUsed: string;
}> {
  const supabase = createServiceClient();
  await supabase
    .from('audit_ready_pbc_uploads')
    .update({ status: 'parsing', parse_started_at: new Date().toISOString() })
    .eq('id', opts.uploadId);

  try {
    const { data: fileData, error: dlErr } = await supabase.storage
      .from('audit-ready-pbc')
      .download(opts.storagePath);
    if (dlErr || !fileData) throw new Error(`download_failed:${dlErr?.message}`);

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const rawText = await extractTextFromBuffer(buffer, opts.contentType);
    const redaction = await redactPii(rawText, { runNer: true });

    const engagementKey =
      process.env[`AR_ENGAGEMENT_KEY_${opts.engagementId}`] ??
      process.env.AR_DEFAULT_ENGAGEMENT_KEY;
    if (!engagementKey) {
      throw new Error('missing_env:AR_DEFAULT_ENGAGEMENT_KEY');
    }

    const encrypted = encryptRedactionMap(redaction.entities, engagementKey);
    const { data: mapRow, error: mapErr } = await supabase
      .from('audit_ready_pii_redaction_maps')
      .insert({
        engagement_id: opts.engagementId,
        source_upload_id: opts.uploadId,
        redaction_map_hash: redaction.mapHash,
        entity_count: redaction.entities.length,
        entity_categories: [
          ...new Set(redaction.entities.map((e) => e.category)),
        ],
        encrypted_map_ciphertext: encrypted.ciphertext,
        encryption_key_ref: encrypted.keyRef,
      })
      .select()
      .single();
    if (mapErr) throw new Error(`redaction_map_insert_failed:${mapErr.message}`);

    const cap = await checkEngagementCap(opts.engagementId, 'sonnet');
    if (!cap.allowed) {
      await supabase
        .from('audit_ready_pbc_uploads')
        .update({
          status: 'failed',
          parse_error: `engagement_cap_exceeded:${cap.currentSpendCents}c/${cap.capCents}c`,
          parse_completed_at: new Date().toISOString(),
        })
        .eq('id', opts.uploadId);
      throw new Error('engagement_cap_exceeded');
    }

    const extractResult = await invokeBedrock({
      model: cap.modelToUse,
      systemPrompt:
        'You are an expert audit PBC (Provided By Client) list parser. Given a document (possibly a PBC request list, engagement letter, or auditor email), extract every distinct request into structured JSON. ' +
        'Return: { "requests": [{ "request_number": "<e.g. 1.1 or A-01>", "request_description": "<full text>", "requested_by": "<auditor name or firm if present>", "source_account_hint": "<GL account or category, if inferrable>", "due_date": "<YYYY-MM-DD or null>" }] } ' +
        'If the document is not a PBC list at all, return { "requests": [] }. Do not include the [PERSON_N], [ADDRESS_N], [SSN_N] placeholders in your reasoning — they represent redacted PII and should be treated as opaque tokens.',
      userPrompt: redaction.redacted.slice(0, 100_000),
      maxTokens: 4096,
      temperature: 0.1,
    });

    await logUsage(
      {
        engagementId: opts.engagementId,
        operation: 'pbc_parse',
        calledByUserId: opts.calledByUserId,
        redactionMapId: mapRow.id,
      },
      extractResult,
      cap.modelToUse,
      true,
    );

    let extracted: { requests: ParsedPbcRequest[] };
    try {
      extracted = JSON.parse(extractResult.content);
    } catch {
      const match = extractResult.content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('llm_output_unparseable');
      extracted = JSON.parse(match[0]);
    }

    const requests = extracted.requests ?? [];
    if (requests.length > 0) {
      const classified = await classifyAssertions(
        requests,
        opts.engagementId,
        opts.calledByUserId,
      );
      for (let i = 0; i < requests.length; i++) {
        requests[i].assertion_tags = classified[i] ?? [];
      }
    }

    if (requests.length > 0) {
      const { error: insErr } = await supabase
        .from('audit_ready_pbc_requests')
        .insert(
          requests.map((r) => ({
            engagement_id: opts.engagementId,
            request_number: r.request_number,
            request_description: r.request_description,
            requested_by: r.requested_by ?? null,
            assertion_tags: r.assertion_tags ?? [],
            source_account_hint: r.source_account_hint ?? null,
            due_date: r.due_date ?? null,
            status: 'pending',
          })),
        );
      if (insErr) throw new Error(`pbc_requests_insert_failed:${insErr.message}`);
    }

    await supabase
      .from('audit_ready_pbc_uploads')
      .update({
        status: 'parsed',
        parse_completed_at: new Date().toISOString(),
        extracted_request_count: requests.length,
      })
      .eq('id', opts.uploadId);

    await supabase.rpc('increment_pbc_request_count', {
      p_engagement_id: opts.engagementId,
      p_delta: requests.length,
    });

    return {
      requestsExtracted: requests.length,
      totalCostCents: 0,
      modelUsed: extractResult.modelId,
    };
  } catch (err) {
    await supabase
      .from('audit_ready_pbc_uploads')
      .update({
        status: 'failed',
        parse_error: err instanceof Error ? err.message : String(err),
        parse_completed_at: new Date().toISOString(),
      })
      .eq('id', opts.uploadId);
    throw err;
  }
}
