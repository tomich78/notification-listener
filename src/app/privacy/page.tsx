/**
 * Política de privacidad.
 *
 * ATENCIÓN: este texto lo redactó Claude a partir de lo que hace el código,
 * no un abogado. Antes de tratarlo como el documento definitivo tendría que
 * leerlo alguien que sepa.
 *
 * Reemplaza a la versión del 30 de mayo de 2025, que describía una
 * arquitectura que ya no existe: decía que las notificaciones se enviaban a
 * "a server you configure yourself", que el usuario era responsable de esos
 * datos, que no se recolectaba ninguna identidad ("No personal identity
 * information (name, email, phone number) is collected") y que la app no
 * retenía el contenido de las notificaciones más allá de lo necesario para
 * entregarlo. Hoy nada de eso es cierto: hay cuentas con correo (Firebase
 * Auth), un panel alojado por nosotros, pagos por MercadoPago y las
 * notificaciones se guardan en Firestore.
 *
 * IMPORTANTE: esto tiene que seguir coincidiendo con el formulario de
 * Seguridad de los datos de Google Play. Si cambia lo que se guarda, hay que
 * actualizar los tres: este texto, la fecha del encabezado y ese formulario.
 *
 * Pendiente de confirmar (no se puede deducir del código, está escrito como
 * "mientras la cuenta exista"): no hay ningún job de limpieza ni TTL sobre la
 * colección `notifications`, así que hoy el contenido se guarda por tiempo
 * indefinido. Si se define un plazo de retención, hay que decirlo acá.
 */

import Link from "next/link";

export const metadata = {
  title: "Política de privacidad – NListener",
};

const h2 = { fontSize: 20, fontWeight: 600, marginTop: 32 } as const;
const link = { color: "#2563eb" } as const;

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "sans-serif", lineHeight: 1.7, color: "#1a1a1a" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Política de privacidad</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>Última actualización: 5 de noviembre de 2026</p>

      <p>
        NListener es desarrollado y operado por <strong>Tomás Degano Sal</strong>. Esta política
        explica qué datos maneja el servicio —la aplicación de Android y el panel web—, para qué,
        con quién se comparten y cómo borrarlos.
      </p>

      <h2 style={h2}>1. Qué datos se recolectan</h2>

      <p><strong>De tu cuenta</strong></p>
      <ul>
        <li>Tu dirección de correo electrónico y tu contraseña, gestionadas por Firebase Authentication</li>
        <li>Un identificador interno de usuario</li>
        <li>Si el correo está verificado, y la fecha de creación de la cuenta</li>
        <li>Opcionalmente un nombre para mostrar</li>
      </ul>

      <p><strong>De los dispositivos que conectás</strong></p>
      <ul>
        <li>El nombre que le ponés a cada dispositivo y un identificador</li>
        <li>Un token de dispositivo, que es lo que autoriza a ese teléfono a enviar datos</li>
        <li>Un token de notificaciones push (Firebase Cloud Messaging), para avisarte en el panel</li>
        <li>Señales de actividad, para mostrarte si el dispositivo sigue conectado</li>
      </ul>

      <p><strong>Diagnósticos de la aplicación de Android</strong></p>
      <p>
        La aplicación incluye <strong>Firebase Crashlytics</strong>, que recoge automáticamente
        informes cuando la app se cierra de forma inesperada: el tipo de error, el lugar del código
        donde ocurrió, el modelo del dispositivo, la versión de Android y un identificador de
        instalación. Sirve para enterarnos de las fallas y corregirlas. No incluye el contenido de
        tus notificaciones.
      </p>

      <p><strong>De las notificaciones de cobro</strong></p>
      <p>
        Por cada notificación de las apps que vos elegís, se guarda:
      </p>
      <ul>
        <li>
          <strong>El texto de la notificación</strong>, hasta 1000 caracteres (el contenido tal
          como lo generó la app de cobro)
        </li>
        <li>El nombre de la app que la generó</li>
        <li>El importe, extraído automáticamente de ese texto</li>
        <li>La fecha y hora</li>
        <li>Qué dispositivo y qué cuenta la enviaron</li>
      </ul>
      <p>
        Esto es lo más sensible que maneja el servicio: <strong>son datos financieros de tu
        negocio, y el texto de una notificación de cobro puede incluir el nombre de quien te
        pagó.</strong> No lo tratamos como un dato menor y no se usa para nada que no sea
        mostrártelo en tu panel.
      </p>

      <p><strong>De los pagos</strong></p>
      <ul>
        <li>El plan de tu cuenta, su vencimiento y el identificador de tu suscripción en MercadoPago</li>
        <li>El registro de los pagos procesados, para no cobrar dos veces lo mismo</li>
        <li>El cupón que hayas usado, si usaste alguno</li>
      </ul>
      <p>
        <strong>Los datos de tu tarjeta no pasan por nosotros.</strong> El pago se hace dentro de
        MercadoPago; nosotros recibimos únicamente la confirmación y el identificador de la
        suscripción.
      </p>

      <h2 style={h2}>2. Para qué se usan</h2>
      <p>
        Para que el servicio funcione: autenticarte, vincular tus dispositivos, mostrar los cobros
        en tu panel y en el de las sucursales que habilites, avisarte por push, aplicar los
        límites de tu plan y cobrar la suscripción si contratás el plan Pro.
      </p>
      <p>
        <strong>No se usan para publicidad</strong>, no se analizan con fines comerciales, no se
        elaboran perfiles y no se entrenan modelos con ellos.
      </p>

      <h2 style={h2}>3. Dónde se guardan y con quién se comparten</h2>
      <p>
        Los datos se guardan en infraestructura de terceros que actúan como proveedores nuestros,
        no por cuenta propia:
      </p>
      <ul>
        <li>
          <strong>Google (Firebase)</strong> — autenticación, base de datos (Firestore),
          notificaciones push e informes de fallas (Crashlytics)
        </li>
        <li>
          <strong>Vercel</strong> — alojamiento del panel web
        </li>
        <li>
          <strong>MercadoPago</strong> — procesamiento de los pagos, cuando contratás el plan Pro
        </li>
      </ul>
      <p>
        Esos proveedores pueden alojar los datos fuera de la Argentina. Fuera de ellos,{" "}
        <strong>no vendemos, alquilamos ni compartimos tus datos con nadie</strong>, y no se
        transfieren salvo obligación legal.
      </p>
      <p>
        Dentro de tu propia cuenta, los cobros se muestran a las personas que vos habilites en el
        modo sucursales, con la visibilidad que vos les configures. Eso lo decidís vos.
      </p>

      <h2 style={h2}>4. Cuánto tiempo se conservan</h2>
      <p>
        Mientras tu cuenta exista. Las notificaciones guardadas no tienen hoy un borrado
        automático por antigüedad: quedan disponibles en tu panel hasta que elimines tu cuenta.
      </p>

      <h2 style={h2}>5. Cómo están protegidos</h2>
      <p>
        La comunicación con el servidor va cifrada por HTTPS. El acceso a tu panel requiere tu
        cuenta, y cada dispositivo necesita su token para poder enviar datos. Las consultas se
        validan en el servidor contra tu identificador de usuario, de forma que una cuenta no pueda
        leer los datos de otra.
      </p>

      <h2 style={h2}>6. Permisos de la aplicación de Android</h2>
      <ul>
        <li><strong>Acceso a notificaciones</strong> — para leer las notificaciones de las apps que elegís</li>
        <li><strong>Internet</strong> — para enviarlas a tu panel</li>
        <li><strong>Servicio en primer plano</strong> — para mantener la escucha activa en segundo plano</li>
        <li><strong>Inicio al encender</strong> — para volver a arrancar el servicio después de reiniciar</li>
        <li><strong>Wake lock</strong> — para seguir enviando con la pantalla apagada</li>
        <li><strong>Cámara</strong> — solo para escanear el código QR durante la configuración inicial</li>
      </ul>
      <p>
        El escaneo del QR se hace <strong>dentro del teléfono</strong>: la imagen de la cámara no
        se envía a ningún servidor ni se guarda.
      </p>
      <p>
        La aplicación lee únicamente las notificaciones de las apps que vos seleccionás. El resto
        no se procesa ni se envía.
      </p>

      <h2 style={h2}>7. Tu responsabilidad sobre los dispositivos</h2>
      <p>
        El servicio lee notificaciones del dispositivo donde instalás la aplicación. Sos
        responsable de tener derecho a hacerlo: de que el dispositivo sea tuyo o de tu negocio, y
        de que quien lo use esté al tanto. Está desarrollado en los{" "}
        <Link href="/terms" style={link}>Términos del Servicio</Link>.
      </p>

      <h2 style={h2}>8. Cómo borrar tus datos</h2>
      <p>
        Podés eliminar tu cuenta en cualquier momento desde{" "}
        <Link href="/delete-account" style={link}>eliminar cuenta</Link>. Eso borra tu cuenta, tus
        dispositivos y las notificaciones guardadas. La acción no se puede deshacer.
      </p>
      <p>
        También podés escribir a{" "}
        <a href="mailto:tdsdeveloper00@gmail.com" style={link}>tdsdeveloper00@gmail.com</a>{" "}
        desde la dirección con la que te registraste, para pedir acceso a tus datos, su corrección
        o su eliminación.
      </p>
      <p>
        Desinstalar la aplicación de Android corta el envío de nuevas notificaciones, pero no
        borra lo que ya está guardado en tu panel: para eso hay que eliminar la cuenta.
      </p>

      <h2 style={h2}>9. Menores de edad</h2>
      <p>
        NListener es una herramienta para negocios, no está dirigida a menores de 13 años y no
        recolecta deliberadamente datos de menores de esa edad.
      </p>

      <h2 style={h2}>10. Cambios en esta política</h2>
      <p>
        Si esta política cambia, se publica en esta página con la fecha actualizada, y los cambios
        importantes se avisan por correo o dentro del panel.
      </p>

      <h2 style={h2}>11. Contacto</h2>
      <p>
        Por cualquier duda sobre tus datos:{" "}
        <a href="mailto:tdsdeveloper00@gmail.com" style={link}>
          tdsdeveloper00@gmail.com
        </a>
      </p>

      <p style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #eee", color: "#666", fontSize: 14 }}>
        <Link href="/terms" style={link}>Términos del Servicio</Link>
        {" · "}
        <Link href="/" style={link}>Volver al inicio</Link>
      </p>
    </main>
  );
}
