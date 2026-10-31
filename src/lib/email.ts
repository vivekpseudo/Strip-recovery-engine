import { config } from "./config.js";
export type DunningMessage = { to: string; customerName?: string; invoiceId: string; paymentUpdateUrl: string };
export interface EmailProvider { sendPaymentFailed(message: DunningMessage): Promise<{ providerId: string }> }

export const emailProvider: EmailProvider = {
  async sendPaymentFailed(message) {
    if (!config.RESEND_API_KEY || !config.EMAIL_FROM) throw new Error("email_provider_not_configured");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: config.EMAIL_FROM, to: [message.to], subject: "Action needed: update your payment method",
        html: `<p>Hello ${escapeHtml(message.customerName ?? "there")},</p><p>We couldn't process your recent subscription payment.</p><p><a href="${escapeHtml(message.paymentUpdateUrl)}">Update payment method securely</a></p><p>If you've already updated your details, you can ignore this email.</p>`
      })
    });
    if (!response.ok) throw new Error(`email_provider_failed_${response.status}`);
    const data = await response.json() as { id: string };
    return { providerId: data.id };
  }
};
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!); }
