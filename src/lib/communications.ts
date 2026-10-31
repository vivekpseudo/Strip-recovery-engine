export type ChannelMessage = { to: string; body: string; idempotencyKey: string };
export interface ChannelProvider { send(message: ChannelMessage): Promise<{ providerId: string }> }

export class TwilioSmsProvider implements ChannelProvider {
  constructor(private sid: string, private token: string, private from: string) {}
  async send(message: ChannelMessage) {
    const auth = Buffer.from(`${this.sid}:${this.token}`).toString("base64");
    const body = new URLSearchParams({ To: message.to, From: this.from, Body: message.body });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.sid}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
    if (!response.ok) throw new Error(`twilio_send_failed_${response.status}`);
    const data = await response.json() as { sid: string };
    return { providerId: data.sid };
  }
}

export class WhatsAppCloudProvider implements ChannelProvider {
  constructor(private token: string, private phoneNumberId: string) {}
  async send(message: ChannelMessage) {
    const response = await fetch(`https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`, {
      method: "POST", headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: message.to, type: "text", text: { body: message.body } })
    });
    if (!response.ok) throw new Error(`whatsapp_send_failed_${response.status}`);
    const data = await response.json() as { messages?: Array<{ id: string }> };
    return { providerId: data.messages?.[0]?.id ?? "accepted" };
  }
}
