/**
 * Negative fixture: credential update outside the only allowlisted function name
 * in a persist-like module.
 */

type FixtureAdmin = {
  from: (table: string) => {
    update: (payload: Record<string, string>) => {
      eq: (column: string, value: string) => Promise<void>;
    };
  };
};

export async function updateGrantByIdUnconditional(
  admin: FixtureAdmin,
  connectionId: string,
  payload: Record<string, string>,
) {
  await admin.from("accounting_connections").update(payload).eq("id", connectionId);
}

export async function sneakyExtraCredentialWrite(admin: FixtureAdmin) {
  const payload = {
    access_token: "x",
    refresh_token: "y",
    updated_at: new Date().toISOString(),
  };
  await admin.from("accounting_connections").update(payload).eq("id", "conn-1");
}
