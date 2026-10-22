export type DunningMessage = {
  to: string;
  customerName?: string;
  invoiceId: string;
  paymentUpdateUrl: string;
};

export interface EmailProvider {
  sendPaymentFailed(message: DunningMessage): Promise<void>;
}

// Safe no-op until a provider is configured. Replace with Resend integration and add
// suppression/consent checks before sending any customer communications.
export const emailProvider: EmailProvider = {
  async sendPaymentFailed(message) {
    console.info(JSON.stringify({
      level: "info",
      event: "dunning_email_not_sent_provider_unconfigured",
      invoiceId: message.invoiceId
    }));
  }
};
