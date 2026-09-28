import "server-only";
import nodemailer from "nodemailer";
import { z } from "zod";

export async function sendAccountMail(email: string, kind: "invitation" | "reset", link: string): Promise<boolean> {
  if (!process.env.SMTP_HOST && !process.env.SMTP_FROM) return false;
  const config = z.object({
    host: z.string().min(1), port: z.coerce.number().int().min(1).max(65535),
    from: z.email(), user: z.string().optional(), password: z.string().optional(),
  }).parse({ host: process.env.SMTP_HOST, port: process.env.SMTP_PORT ?? "465", from: process.env.SMTP_FROM, user: process.env.SMTP_USER, password: process.env.SMTP_PASSWORD });
  const local = ["localhost", "127.0.0.1", "::1"].includes(config.host);
  if (!local && (!config.user || !config.password)) throw new Error("El correo requiere credenciales SMTP.");
  const secure = process.env.SMTP_SECURE !== "false";
  const transport = nodemailer.createTransport({
    host: config.host, port: config.port, secure, requireTLS: !local && !secure,
    auth: config.user && config.password ? { user: config.user, pass: config.password } : undefined,
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
    disableFileAccess: true, disableUrlAccess: true,
  });
  const invitation = kind === "invitation";
  const title = invitation ? "Tu invitación a PredictiveMaintenance" : "Recuperar acceso a PredictiveMaintenance";
  const message = invitation ? "Te invitaron al centro de operaciones. Elegí tu contraseña para activar el acceso." : "Recibimos una solicitud para cambiar tu contraseña. Si no fuiste vos, podés ignorar este mensaje.";
  await transport.sendMail({
    from: { name: "PredictiveMaintenance", address: config.from }, to: z.email().parse(email), subject: title,
    text: `${message}\n\n${link}\n\nEl enlace es de un solo uso y vence ${invitation ? "en 48 horas" : "en 30 minutos"}.`,
  });
  return true;
}
