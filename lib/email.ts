/**
 * Provider-agnostic email stub. The app works fully without this configured
 * — sendEmail() just no-ops with a console log if no provider is wired in,
 * per the spec's "must still function without crashing" requirement.
 */

export async function sendEmail(params: { to: string; subject: string; html: string }) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email:skipped, no provider configured] to=${params.to} subject="${params.subject}"`);
    return;
  }

  // Example using Resend:
  // const { Resend } = await import("resend");
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({ from: "no-reply@yourapp.com", to: params.to, subject: params.subject, html: params.html });
}

export function welcomeEmail(name: string) {
  return {
    subject: "Welcome to Digital Learning Library",
    html: `<p>Hi ${name}, thanks for creating an account. Complete your one-time ₦1,000 registration to unlock the full library.</p>`,
  };
}

export function paymentConfirmationEmail(name: string, amountNaira: number) {
  return {
    subject: "Payment confirmed — your access is active",
    html: `<p>Hi ${name}, your ₦${amountNaira.toLocaleString()} one-time registration payment was successful. Your premium access is now active — this is a single charge, it will not renew.</p>`,
  };
}

export function paymentFailedEmail(name: string) {
  return {
    subject: "We couldn't verify your payment",
    html: `<p>Hi ${name}, we weren't able to verify your last payment attempt. Please try again from your dashboard.</p>`,
  };
}
