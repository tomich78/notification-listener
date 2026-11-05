/**
 * Términos del Servicio.
 *
 * ATENCIÓN: este texto lo redactó Claude a partir de lo que hace el código,
 * no un abogado. Antes de tratarlo como el documento definitivo tendría que
 * leerlo alguien que sepa, sobre todo las secciones 4 (baja y reintegros) y 8
 * (límites de responsabilidad): acá se cobran suscripciones a consumidores y
 * el servicio toca datos de cobros.
 *
 * Lo que dice sobre precios, baja y plazos está alineado con el código a la
 * fecha del encabezado: `src/lib/pricing.ts`, `src/app/api/mp/subscribe`,
 * `src/app/api/mp/cancel` y el límite mensual del plan Free en
 * `src/app/api/notifications/route.ts`. Si cambia alguno de esos, hay que
 * actualizar este texto y la fecha.
 */

import Link from "next/link";

export const metadata = {
  title: "Términos del Servicio – NListener",
};

const h2 = { fontSize: 20, fontWeight: 600, marginTop: 32 } as const;
const link = { color: "#2563eb" } as const;

export default function TermsPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "sans-serif", lineHeight: 1.7, color: "#1a1a1a" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Términos del Servicio</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>Última actualización: 5 de noviembre de 2026</p>

      <p>
        NListener es desarrollado y operado por <strong>Tomás Degano Sal</strong>. Estos términos
        son el acuerdo entre vos y el operador por el uso del servicio, que incluye el panel web y
        la aplicación de Android. Usar NListener significa que los aceptás. Si no estás de acuerdo,
        no lo uses.
      </p>

      <h2 style={h2}>1. Qué es NListener</h2>
      <p>
        La aplicación de Android lee las notificaciones de las apps de cobro que vos elegís (por
        ejemplo MercadoPago) en los dispositivos donde la instalás, y las envía a nuestro servidor
        para mostrarlas en tu panel en tiempo real, de modo que las personas que vos autorices
        puedan ver los cobros sin tener el teléfono a mano.
      </p>
      <p>
        Qué datos se manejan, dónde se guardan y por cuánto tiempo está en la{" "}
        <Link href="/privacy" style={link}>política de privacidad</Link>, que forma parte de estos
        términos.
      </p>

      <h2 style={h2}>2. Cuenta</h2>
      <p>
        Para usar el servicio hay que crear una cuenta con tu correo electrónico y verificarlo.
        Sos responsable de la veracidad de los datos que cargás, de mantener tu contraseña a
        resguardo y de la actividad que ocurra con tu cuenta. Si detectás un uso que no reconocés,
        escribinos.
      </p>
      <p>
        Tenés que ser mayor de edad, o contar con autorización, para contratar. El servicio está
        pensado para uso comercial de un negocio, no para menores de 13 años.
      </p>

      <h2 style={h2}>3. Planes y pagos</h2>
      <p>
        Hay un plan <strong>Free</strong> y un plan <strong>Pro</strong>. El plan Free tiene un
        límite mensual de notificaciones y de dispositivos; el plan Pro habilita dispositivos
        ilimitados, el modo sucursales y los reportes en PDF. Los límites y el precio vigentes son
        los que se muestran en la{" "}
        <Link href="/upgrade" style={link}>página del plan Pro</Link> al momento de contratar, y
        pueden cambiar según lo previsto en la sección 9.
      </p>
      <p>El plan Pro se puede pagar de tres formas:</p>
      <ul>
        <li>
          <strong>Suscripción mensual con débito automático</strong>, a través de MercadoPago. Se
          renueva sola todos los meses hasta que la des de baja.
        </li>
        <li>
          <strong>Plan anual</strong>, que se cobra una sola vez por los doce meses con un
          descuento sobre el precio mensual de lista. No se renueva automáticamente.
        </li>
        <li>
          <strong>Pago manual</strong> por un mes o por un año, sin débito automático. Al vencer,
          la cuenta vuelve al plan Free hasta que pagues de nuevo.
        </li>
      </ul>
      <p>
        Los pagos se procesan en <strong>MercadoPago</strong>. Nosotros no vemos ni guardamos los
        datos de tu tarjeta: eso queda en manos de MercadoPago, bajo sus propios términos. Los
        precios están expresados en pesos argentinos e incluyen los impuestos que correspondan.
      </p>
      <p>
        Si usás un cupón de descuento, vale una sola vez por cuenta y bajo las condiciones con las
        que fue emitido.
      </p>

      <h2 style={h2}>4. Baja, vencimiento y reintegros</h2>
      <p>
        Podés dar de baja el débito automático cuando quieras, desde la configuración de tu
        cuenta. Al darlo de baja:
      </p>
      <ul>
        <li>
          <strong>No se corta el acceso en ese momento.</strong> El período que ya pagaste se
          respeta: el plan Pro sigue activo hasta la fecha en la que se habría hecho el próximo
          cobro.
        </li>
        <li>Desde esa fecha, la cuenta pasa automáticamente al plan Free.</li>
        <li>Tus datos no se borran por pasar a Free; se aplican los límites del plan Free.</li>
      </ul>
      <p>
        Como el período en curso se respeta hasta el final, no se hacen reintegros proporcionales
        por el tiempo no usado. Si hubo un cobro duplicado o un error de facturación, escribinos y
        lo corregimos.
      </p>
      <p>
        Si sos consumidor en un país donde la ley te da un derecho de arrepentimiento o de
        desistimiento sobre la contratación a distancia, ese derecho se respeta en los plazos y
        condiciones que esa ley fije, por encima de lo que diga este punto.
      </p>

      <h2 style={h2}>5. Tu responsabilidad sobre las notificaciones</h2>
      <p>
        Para que el servicio funcione, le das a la aplicación permiso para leer las notificaciones
        del dispositivo donde la instalás. <strong>Sos responsable de tener derecho a hacerlo</strong>:
        de que el dispositivo sea tuyo o de tu negocio, de que la persona que lo usa esté al
        tanto, y de que compartir esos avisos con quienes autorices en el panel sea algo que
        podés hacer.
      </p>
      <p>
        No uses NListener para leer las notificaciones del teléfono de otra persona sin que lo
        sepa. Eso no es lo que el servicio es, y es motivo de suspensión de la cuenta.
      </p>

      <h2 style={h2}>6. Uso aceptable</h2>
      <p>No podés:</p>
      <ul>
        <li>Revender, sublicenciar o presentar el servicio como propio.</li>
        <li>
          Intentar acceder a datos de otras cuentas, vulnerar la seguridad del servicio o eludir
          los límites del plan.
        </li>
        <li>Automatizar el envío de datos falsos o inflar el uso de forma artificial.</li>
        <li>Usarlo para algo ilegal o para encubrir una actividad ilegal.</li>
      </ul>
      <p>
        El código, el diseño y la marca del servicio son del operador. Lo que vos cargás y lo que
        el servicio captura de tus cobros <strong>es tuyo</strong>: no se usa para otra cosa que
        hacer funcionar el servicio.
      </p>

      <h2 style={h2}>7. NListener no es un medio de pago ni un comprobante</h2>
      <p>
        Esto es lo más importante de todo el documento, así que va sin vueltas.
      </p>
      <p>
        NListener <strong>no cobra, no acredita ni procesa ningún pago</strong>. Lo único que hace
        es leer y mostrar notificaciones que generan otras aplicaciones. Que una notificación
        aparezca en el panel no prueba que un pago se haya acreditado, y que no aparezca no prueba
        que no se haya hecho.
      </p>
      <p>
        El servicio depende de cosas que no controlamos: que el sistema operativo del teléfono no
        mate el proceso, que el dispositivo tenga conexión y batería, que la app de cobro genere
        la notificación y que su texto no cambie de formato. Por eso{" "}
        <strong>puede perder, demorar, duplicar o leer mal una notificación.</strong>
      </p>
      <p>
        En consecuencia, <strong>no sirve como registro contable, como control de caja ni como
        prueba de un cobro.</strong> Para eso usá siempre el resumen oficial de tu cuenta de
        MercadoPago o de quien te cobre. NListener es una ayuda operativa para enterarte rápido, y
        nada más.
      </p>

      <h2 style={h2}>8. Disponibilidad y límites de responsabilidad</h2>
      <p>
        El servicio se ofrece &ldquo;tal como está&rdquo;, sin garantía de funcionamiento
        ininterrumpido ni libre de errores. Puede haber cortes por mantenimiento, por fallas de
        los proveedores de los que dependemos o por causas ajenas.
      </p>
      <p>
        Hasta donde la ley lo permita, el operador no responde por daños indirectos, lucro
        cesante, ni por pérdidas derivadas de una notificación no recibida, demorada o mal leída,
        conforme a la sección 7. Si por ley correspondiera una responsabilidad, quedará limitada a
        lo que hayas pagado por el servicio en los últimos doce meses.
      </p>
      <p>
        Nada de esta sección limita los derechos que la ley te dé y que no se puedan renunciar. Si
        alguna parte de estos términos no fuera válida donde vivís, no se aplica y el resto sigue
        en pie.
      </p>

      <h2 style={h2}>9. Cambios en el servicio y en estos términos</h2>
      <p>
        Podemos modificar el servicio, los planes, los límites y los precios. Si un cambio de
        precio afecta a una suscripción con débito automático, se avisa con antelación razonable
        al correo de la cuenta, y podés darla de baja antes de que el nuevo precio se aplique.
      </p>
      <p>
        Estos términos pueden cambiar. Los cambios se publican en esta página con la fecha
        actualizada, y los importantes se avisan por correo o dentro del panel. Seguir usando el
        servicio después de un cambio significa que lo aceptás.
      </p>

      <h2 style={h2}>10. Suspensión y fin del servicio</h2>
      <p>
        Podemos suspender o cerrar una cuenta que incumpla estos términos, en especial las
        secciones 5 y 6. Si el incumplimiento no es grave, avisamos antes y te damos la
        oportunidad de corregirlo.
      </p>
      <p>
        Si discontinuamos el servicio, avisamos con antelación razonable para que puedas exportar
        tus datos. Vos podés dejar de usarlo cuando quieras: eliminá tu cuenta desde{" "}
        <Link href="/delete-account" style={link}>eliminar cuenta</Link>.
      </p>

      <h2 style={h2}>11. Ley aplicable</h2>
      <p>
        Estos términos se rigen por las leyes de la República Argentina. Si sos consumidor y
        residís habitualmente en otro país, conservás los derechos que te dé la ley de tu lugar de
        residencia.
      </p>

      <h2 style={h2}>12. Contacto</h2>
      <p>
        Por cualquier duda sobre estos términos:{" "}
        <a href="mailto:tdsdeveloper00@gmail.com" style={link}>
          tdsdeveloper00@gmail.com
        </a>
      </p>

      <p style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #eee", color: "#666", fontSize: 14 }}>
        <Link href="/privacy" style={link}>Política de privacidad</Link>
        {" · "}
        <Link href="/" style={link}>Volver al inicio</Link>
      </p>
    </main>
  );
}
