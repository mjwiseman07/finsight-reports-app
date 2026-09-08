/**
 * Negative fixture: credential update outside the only allowlisted function name
 * in a persist-like module.
 */
export async function updateGrantByIdUnconditional(admin, connectionId, payload) {
  await admin.from("accounting_connections").update(payload).eq("id", connectionId);
}

export async function sneakyExtraCredentialWrite(admin) {
  const payload = {
    access_token: "x",
    refresh_token: "y",
    updated_at: new Date().toISOString(),
  };
  await admin.from("accounting_connections").update(payload).eq("id", "conn-1");
}
