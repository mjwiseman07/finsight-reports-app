import { describe, it, expect } from 'vitest';
import { extractTextFromBuffer } from '@/lib/audit-ready/pbc-parser';

describe('extractTextFromBuffer', () => {
  it('extracts plain text', async () => {
    const t = await extractTextFromBuffer(
      Buffer.from('hello world'),
      'text/plain',
    );
    expect(t).toBe('hello world');
  });

  it('rejects unsupported content type', async () => {
    await expect(
      extractTextFromBuffer(Buffer.from('x'), 'application/x-invalid'),
    ).rejects.toThrow(/unsupported_content_type/);
  });
});
