/** E-Mail-Versand via Nodemailer (SMTP). Mit Dry-Run-Modus für den MVP. */
import nodemailer from "nodemailer";

export interface MailOptions {
  to: string; // Komma-getrennte Empfänger
  subject: string;
  text?: string;
  html?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}

const DRY_RUN = process.env.SMTP_DRY_RUN === "true" || !process.env.SMTP_HOST;

export async function sendMail(opts: MailOptions): Promise<{ dryRun: boolean }> {
  const from = process.env.SMTP_FROM ?? "Gandola & Battaini AG <info@gaba-ag.ch>";

  if (DRY_RUN) {
    console.log("[MAIL DRY-RUN]", {
      from,
      to: opts.to,
      subject: opts.subject,
      attachments: opts.attachments?.map((a) => a.filename),
    });
    return { dryRun: true };
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  await transport.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    attachments: opts.attachments,
  });
  return { dryRun: false };
}
