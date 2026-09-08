/** Negative fixture: inline credential update without CAS — must be rejected. */

/** Minimal PostgREST-like chain used only for AST/gate fixtures. */
type FixtureAdmin = {
  from: (table: string) => {
    update: (payload: Record<string, string>) => {
      eq: (column: string, value: string) => Promise<void>;
    };
  };
};

export async function badInlineWriter(admin: FixtureAdmin) {
  await admin
    .from("accounting_connections")
    .update({
      access_token: "x",
      refresh_token: "y",
      updated_at: new Date().toISOString(),
    })
    .eq("id", "conn-1");
}
