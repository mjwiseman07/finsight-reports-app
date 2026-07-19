import { sendEmail, getSupportEmail } from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/service";

async function loadRecipient(
  firm_id: string,
): Promise<{ email: string; firm_name: string } | null> {
  const supabase = createServiceClient();
  const { data: firm } = await supabase
    .from("firms")
    .select("id, name, owner_user_id")
    .eq("id", firm_id)
    .maybeSingle();
  if (!firm?.owner_user_id) return null;

  const { data: userData, error } = await supabase.auth.admin.getUserById(
    firm.owner_user_id as string,
  );
  if (error || !userData?.user?.email) return null;

  return {
    email: userData.user.email,
    firm_name: (firm.name as string) ?? "your Advisacor workspace",
  };
}

export async function sendPurgeScheduledEmail(
  firm_id: string,
  schedule_id: string,
): Promise<void> {
  const supabase = createServiceClient();
  const [{ data: schedule }, recipient] = await Promise.all([
    supabase
      .from("subscription_purge_schedule")
      .select("grace_until")
      .eq("id", schedule_id)
      .maybeSingle(),
    loadRecipient(firm_id),
  ]);
  if (!schedule || !recipient) return;

  const graceDate = new Date(schedule.grace_until as string).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const from = process.env.GAP2_FROM_EMAIL || `Advisacor <${getSupportEmail()}>`;

  await sendEmail({
    from,
    to: [recipient.email],
    subject: `Your Advisacor data will be permanently deleted on ${graceDate}`,
    text: [
      `Hello,`,
      ``,
      `Your Advisacor subscription for "${recipient.firm_name}" has been cancelled. Per our Privacy Policy, we retain your data for 30 days after cancellation so you can reactivate without data loss.`,
      ``,
      `Your data will be permanently deleted on ${graceDate}.`,
      ``,
      `To preserve your data, reactivate your subscription before that date:`,
      `https://www.advisacor.com/dashboard/account/billing`,
      ``,
      `If you'd like your data deleted sooner, contact ${getSupportEmail()} and reference schedule ID ${schedule_id}.`,
      ``,
      `— The Advisacor team`,
    ].join("\n"),
  });

  await supabase
    .from("subscription_purge_schedule")
    .update({
      notification_sent_at: new Date().toISOString(),
      notification_recipient: recipient.email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", schedule_id);

  await supabase.from("subscription_purge_audit").insert({
    schedule_id,
    firm_id,
    event_type: "notification_sent",
    actor_type: "system_cron",
    details: { recipient: recipient.email },
  });
}

export async function sendReactivationConfirmedEmail(firm_id: string): Promise<void> {
  const recipient = await loadRecipient(firm_id);
  if (!recipient) return;

  const from = process.env.GAP2_FROM_EMAIL || `Advisacor <${getSupportEmail()}>`;

  await sendEmail({
    from,
    to: [recipient.email],
    subject: `Your Advisacor data is preserved — reactivation confirmed`,
    text: [
      `Hello,`,
      ``,
      `Great news — your Advisacor subscription for "${recipient.firm_name}" is active again. The scheduled data purge has been cancelled and your data is fully preserved.`,
      ``,
      `Sign in: https://www.advisacor.com/signin`,
      ``,
      `— The Advisacor team`,
    ].join("\n"),
  });
}

export async function sendCustomerPurgeConfirmEmail(
  email: string,
  confirmUrl: string,
): Promise<void> {
  const from = process.env.GAP2_FROM_EMAIL || `Advisacor <${getSupportEmail()}>`;
  await sendEmail({
    from,
    to: [email],
    subject: "Confirm data deletion — Advisacor",
    text: [
      `You requested permanent deletion of all Advisacor data for your firm.`,
      ``,
      `This action cannot be undone. Once confirmed, we will begin deletion immediately.`,
      ``,
      `Click to confirm (valid for 24 hours):`,
      confirmUrl,
      ``,
      `If you did not request this, ignore this email and change your password.`,
      ``,
      `— Advisacor`,
    ].join("\n"),
  });
}
