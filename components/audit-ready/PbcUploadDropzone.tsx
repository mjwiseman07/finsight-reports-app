'use client';

import { useState, useCallback } from 'react';
import { primaryCtaClass, focusRing } from '@/components/site-ui';

const ACCEPT = '.pdf,.xlsx,.xls,.docx,.doc,.eml,.txt';

export function PbcUploadDropzone({
  engagementId,
  onParsed,
}: {
  engagementId: string;
  onParsed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setStatus(`Uploading ${file.name}…`);
      try {
        const form = new FormData();
        form.set('file', file);
        const upRes = await fetch(
          `/api/audit-ready/${engagementId}/pbc/upload`,
          { method: 'POST', body: form },
        );
        const upJson = await upRes.json();
        if (!upRes.ok) throw new Error(upJson.error ?? 'upload_failed');

        setStatus('Parsing with Bedrock (zero-retention)…');
        const parseRes = await fetch(
          `/api/audit-ready/${engagementId}/pbc/parse`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ upload_id: upJson.upload.id }),
          },
        );
        const parseJson = await parseRes.json();
        if (!parseRes.ok) throw new Error(parseJson.error ?? 'parse_failed');

        setStatus(
          `Parsed ${parseJson.requestsExtracted} request${parseJson.requestsExtracted === 1 ? '' : 's'} — assertion tags applied.`,
        );
        onParsed();
      } catch (err) {
        setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setBusy(false);
      }
    },
    [engagementId, onParsed],
  );

  return (
    <div className="rounded-lg border border-dashed border-[#C9A961]/30 bg-[#1A1A1C]/50 p-8 text-center">
      <label className="inline-block cursor-pointer">
        <input
          type="file"
          accept={ACCEPT}
          disabled={busy}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        <span className={`${primaryCtaClass} ${focusRing()} inline-flex`}>
          {busy ? 'Working…' : 'Upload PBC list'}
        </span>
      </label>
      <p className="mt-3 text-sm text-[#A29E93]">
        PDF, XLSX, DOCX, EML, or TXT. Max 50MB. PII is redacted before Bedrock
        parse.
      </p>
      {status && (
        <p className="mt-4 font-mono text-sm text-[#ECEBE7]">{status}</p>
      )}
    </div>
  );
}
