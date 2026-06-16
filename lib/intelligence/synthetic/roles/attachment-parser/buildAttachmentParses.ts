import {
  buildAttachmentParse,
  type BuildAttachmentParseInput,
  type SyntheticAttachmentParse,
} from "./buildAttachmentParse";

export interface BuildAttachmentParsesInput {
  items: BuildAttachmentParseInput[];
}

export interface BuildAttachmentParsesResult {
  attachmentParses: SyntheticAttachmentParse[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildAttachmentParses(input: BuildAttachmentParsesInput): BuildAttachmentParsesResult {
  const attachmentParses: SyntheticAttachmentParse[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildAttachmentParse(item);

    if (result.attachmentParse) {
      attachmentParses.push(result.attachmentParse);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `attachmentParses[${index}]: ${warning}`));
  });

  return {
    attachmentParses,
    skippedIndexes,
    warnings,
  };
}
