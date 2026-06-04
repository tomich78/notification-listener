import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "NListener <nlistener@estamoscerca.com.ar>";
const ADMIN_EMAIL = "tdsdeveloper00@gmail.com";

export async function sendNewUserEmail(name: string, email: string) {
  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: "🆕 Nuevo usuario registrado — NListener",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1d4ed8;">Nuevo usuario registrado</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Nombre</td>
            <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td>
            <td style="padding: 8px 0; font-size: 14px;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Fecha</td>
            <td style="padding: 8px 0; font-size: 14px;">${new Date().toLocaleString("es-AR")}</td>
          </tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <a href="https://nlistener.com.ar/admin"
           style="color: #2563eb; font-size: 13px;">
          Ver en panel de admin →
        </a>
      </div>
    `,
  });
}

export async function sendNewSubscriberEmail(email: string, subscriptionId: string) {
  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: "💰 Nueva suscripción Pro — NListener",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">Nueva suscripción Pro</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Email</td>
            <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Suscripción MP</td>
            <td style="padding: 8px 0; font-size: 14px; font-family: monospace;">${subscriptionId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Fecha</td>
            <td style="padding: 8px 0; font-size: 14px;">${new Date().toLocaleString("es-AR")}</td>
          </tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <a href="https://nlistener.com.ar/admin"
           style="color: #7c3aed; font-size: 13px;">
          Ver en panel de admin →
        </a>
      </div>
    `,
  });
}

export async function sendCancellationEmail(email: string) {
  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: "⚠️ Suscripción cancelada — NListener",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Suscripción cancelada</h2>
        <p style="font-size: 14px; color: #374151;">
          El usuario <strong>${email}</strong> canceló su suscripción Pro.
          Su cuenta fue bajada a plan Free automáticamente.
        </p>
        <p style="font-size: 13px; color: #6b7280;">
          ${new Date().toLocaleString("es-AR")}
        </p>
      </div>
    `,
  });
}
