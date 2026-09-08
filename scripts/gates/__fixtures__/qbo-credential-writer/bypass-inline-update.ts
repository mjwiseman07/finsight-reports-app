/** Negative fixture: inline credential update without CAS — must be rejected. */
export async function badInlineWriter(admin) {
  await admin
    .from("accounting_connections")
    .update({
      access_token: "x",
      refresh_token: "y",
      updated_at: new Date().toISOString(),
    })
    .eq("id", "conn-1");
}
