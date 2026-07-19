import { describe, it, expect, vi } from 'vitest';
import { redactPii, encryptRedactionMap } from '@/lib/audit-ready/pii-redaction';

vi.mock('@/lib/audit-ready/bedrock-client', () => ({
  invokeBedrock: vi.fn(async () => ({
    content: JSON.stringify({ entities: [] }),
    promptTokens: 10,
    completionTokens: 5,
    modelId: 'haiku',
    latencyMs: 12,
    requestHash: 'abc',
  })),
  estimateCostCents: vi.fn(() => 1),
  isBedrockZeroRetentionEnabled: vi.fn(() => true),
}));

describe('pii-redaction (regex pass)', () => {
  it('redacts SSN', async () => {
    const r = await redactPii('John SSN 123-45-6789 records', { runNer: false });
    expect(r.redacted).toContain('[SSN_1]');
    expect(r.redacted).not.toContain('123-45-6789');
    expect(r.entities.find((e) => e.category === 'ssn')).toBeDefined();
  });

  it('redacts email + phone', async () => {
    const r = await redactPii('Contact matt@example.com or 555-123-4567', {
      runNer: false,
    });
    expect(r.redacted).toContain('[EMAIL_1]');
    expect(r.redacted).toContain('[PHONE_1]');
  });

  it('produces stable mapHash for stable input', async () => {
    const a = await redactPii('SSN 111-11-1111', { runNer: false });
    const b = await redactPii('SSN 111-11-1111', { runNer: false });
    expect(a.mapHash).toBe(b.mapHash);
  });

  it('encrypts redaction map with 32-byte key', () => {
    const key = Buffer.alloc(32, 7).toString('base64');
    const { ciphertext, keyRef } = encryptRedactionMap(
      [
        {
          category: 'ssn',
          original: '123-45-6789',
          placeholder: '[SSN_1]',
          startOffset: 0,
          endOffset: 11,
        },
      ],
      key,
    );
    expect(ciphertext.length).toBeGreaterThan(0);
    expect(keyRef).toHaveLength(16);
  });
});
