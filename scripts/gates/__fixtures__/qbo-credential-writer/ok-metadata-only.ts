/** Positive control: metadata-only update must not be classified as credential writer. */

type FixtureAdmin = {
  from: (table: string) => {
    update: (payload: Record<string, string>) => {
      eq: (column: string, value: string) => Promise<void>;
    };
  };
};

export async function metadataOnly(admin: FixtureAdmin) {
  await admin
    .from("accounting_connections")
    .update({
      status: "disconnected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", "conn-1");
}
