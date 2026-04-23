import nodemailer from "nodemailer";

function getSmtpPort() {
  const rawPort = process.env.SMTP_PORT?.trim();
  const parsedPort = rawPort ? Number(rawPort) : NaN;

  return Number.isFinite(parsedPort) ? parsedPort : 587;
}

function isSmtpSecure() {
  return process.env.SMTP_SECURE?.trim() === "true";
}

export function isPasswordResetEmailConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_FROM?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim(),
  );
}

function getMailerTransport() {
  if (!isPasswordResetEmailConfigured()) {
    throw new Error("SMTP_NOT_CONFIGURED");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim(),
    port: getSmtpPort(),
    secure: isSmtpSecure(),
    auth: {
      user: process.env.SMTP_USER?.trim(),
      pass: process.env.SMTP_PASS?.trim(),
    },
  });
}

export async function sendPasswordResetEmail(input: {
  email: string;
  name?: string | null;
  resetUrl: string;
  expiresAt: Date;
}) {
  const transport = getMailerTransport();
  const from = process.env.SMTP_FROM?.trim();
  const greetingName = input.name?.trim() || input.email;
  const expiresText = input.expiresAt.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  await transport.sendMail({
    from,
    to: input.email,
    subject: "Redefinicao de senha - Dropship Control",
    text: [
      `Ola, ${greetingName}.`,
      "",
      "Recebemos um pedido para redefinir sua senha no Dropship Control.",
      `Use este link seguro ate ${expiresText}:`,
      input.resetUrl,
      "",
      "Se voce nao pediu essa redefinicao, ignore este e-mail.",
    ].join("\n"),
    html: `
      <p>Ola, ${greetingName}.</p>
      <p>Recebemos um pedido para redefinir sua senha no <strong>Dropship Control</strong>.</p>
      <p>Use este link seguro ate <strong>${expiresText}</strong>:</p>
      <p><a href="${input.resetUrl}">${input.resetUrl}</a></p>
      <p>Se voce nao pediu essa redefinicao, ignore este e-mail.</p>
    `,
  });
}
