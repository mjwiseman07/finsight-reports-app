/**
 * Phase G7 — Windows-safe vertical folder mapping.
 * `CON` is a reserved Windows device name; construction filings use `construction/`.
 */
const VERTICAL_FOLDER_ALIASES: Record<string, string> = {
  con: "construction",
};

export function verticalFolderName(vertical: string): string {
  return VERTICAL_FOLDER_ALIASES[vertical] ?? vertical;
}

export function verticalFromFolderName(folder: string): string {
  const match = Object.entries(VERTICAL_FOLDER_ALIASES).find(([, alias]) => alias === folder);
  return match?.[0] ?? folder;
}
