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

/* ─── Mails al CLIENTE (no al admin) ─────────────────────────────────── */

function userEmailWrapper(title: string, color: string, bodyHtml: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: ${color};">${title}</h2>
      ${bodyHtml}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
      <p style="font-size: 12px; color: #9ca3af;">
        ¿Preguntas? Escribinos a
        <a href="mailto:${ADMIN_EMAIL}" style="color: #2563eb;">${ADMIN_EMAIL}</a>
      </p>
    </div>
  `;
}

// Primera vez que se activa la suscripción Pro
export async function sendWelcomeProEmail(email: string) {
  if (!email) return;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "🎉 ¡Bienvenido a NListener Pro!",
    html: userEmailWrapper(
      "¡Listo, ya sos Pro!",
      "#7c3aed",
      `
        <p style="font-size: 14px; color: #374151;">
          Tu suscripción se activó correctamente. Ya tenés acceso a dispositivos
          ilimitados, modo sucursales y reportes en PDF.
        </p>
        <p style="font-size: 14px; color: #374151;">
          El cobro se va a renovar automáticamente cada mes. Te vamos a avisar
          por mail antes de cada renovación y si hay algún problema con el pago.
        </p>
        <p style="font-size: 13px; color: #6b7280;">${new Date().toLocaleString("es-AR")}</p>
      `
    ),
  });
}

// Se renovó el pago mensual con éxito
export async function sendPaymentRenewedEmail(email: string, amount: number) {
  if (!email) return;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "✅ Tu suscripción Pro de NListener se renovó",
    html: userEmailWrapper(
      "¡Pago confirmado!",
      "#16a34a",
      `
        <p style="font-size: 14px; color: #374151;">
          Se renovó tu suscripción <strong>Pro</strong> de NListener por
          <strong>$${amount.toLocaleString("es-AR")}</strong>. Seguís con acceso completo
          a dispositivos ilimitados, modo sucursales y reportes en PDF.
        </p>
        <p style="font-size: 13px; color: #6b7280;">${new Date().toLocaleString("es-AR")}</p>
      `
    ),
  });
}

// El cobro automático del mes falló (tarjeta rechazada, fondos insuficientes, etc.)
export async function sendPaymentFailedEmail(email: string) {
  if (!email) return;
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "⚠️ No pudimos procesar el pago de tu suscripción NListener",
    html: userEmailWrapper(
      "Hubo un problema con tu pago",
      "#d97706",
      `
        <p style="font-size: 14px; color: #374151;">
          Intentamos cobrar tu suscripción <strong>Pro</strong> de NListener y el pago fue rechazado.
          Puede ser por fondos insuficientes, tarjeta vencida o un bloqueo del banco.
        </p>
        <p style="font-size: 14px; color: #374151;">
          MercadoPago va a reintentar el cobro automáticamente en los próximos días.
          Si el problema persiste, tu suscripción se cancelará y tu cuenta volverá
          al plan Free.
        </p>
        <p style="font-size: 14px; color: #374151;">
          Para evitarlo, revisá el medio de pago asociado a tu suscripción en MercadoPago.
        </p>
        <p style="font-size: 13px; color: #6b7280;">${new Date().toLocaleString("es-AR")}</p>
      `
    ),
  });
}

// La suscripción se canceló (por el usuario o por falta de pago) — aviso al cliente
export async function sendUserCancellationEmail(email: string, reason: "manual" | "payment_failed") {
  if (!email) return;
  const reasonText = reason === "payment_failed"
    ? "por no haberse podido procesar el pago luego de varios intentos"
    : "a pedido tuyo o de tu medio de pago";

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Tu suscripción Pro de NListener fue cancelada",
    html: userEmailWrapper(
      "Suscripción cancelada",
      "#dc2626",
      `
        <p style="font-size: 14px; color: #374151;">
          Tu suscripción <strong>Pro</strong> de NListener se canceló ${reasonText}.
          Tu cuenta volvió al plan <strong>Free</strong> automáticamente — no se te va a
          cobrar nada más.
        </p>
        <p style="font-size: 14px; color: #374151;">
          Si fue un error o querés reactivarla, podés volver a suscribirte desde tu panel
          en cualquier momento.
        </p>
        <p style="font-size: 13px; color: #6b7280;">${new Date().toLocaleString("es-AR")}</p>
      `
    ),
  });
}
