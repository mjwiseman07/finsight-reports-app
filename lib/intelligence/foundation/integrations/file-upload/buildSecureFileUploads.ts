import {
  buildSecureFileUpload,
  type BuildSecureFileUploadInput,
  type SyntheticSecureFileUpload,
} from "./buildSecureFileUpload";

export interface BuildSecureFileUploadsInput {
  secureFileUploads: BuildSecureFileUploadInput[];
}

export interface BuildSecureFileUploadsResult {
  secureFileUploads: SyntheticSecureFileUpload[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildSecureFileUploads(input: BuildSecureFileUploadsInput): BuildSecureFileUploadsResult {
  const secureFileUploads: SyntheticSecureFileUpload[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.secureFileUploads.forEach((uploadInput, index) => {
    const result = buildSecureFileUpload({
      ...uploadInput,
      skippedIndexes: [...(uploadInput.skippedIndexes ?? []), index],
    });

    if (result.secureFileUpload) {
      secureFileUploads.push(result.secureFileUpload);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `secureFileUpload[${index}]: ${warning}`));
  });

  return {
    secureFileUploads,
    skippedIndexes,
    warnings,
  };
}
