import Link from "next/link";
import Image from "next/image";

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <Image src="/logo.png" alt="NListener" width={36} height={36} />
          <span className="text-xl font-semibold text-gray-900">NListener</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Eliminar cuenta y datos
        </h1>
        <p className="text-gray-500 mb-8">
          En esta página encontrás los pasos para solicitar la eliminación de tu
          cuenta y los datos asociados en NListener.
        </p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            ¿Cómo eliminar tu cuenta?
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>
              Iniciá sesión en{" "}
              <Link href="https://nlistener.com.ar" className="text-blue-600 underline">
                nlistener.com.ar
              </Link>
            </li>
            <li>Ingresá a <strong>Configuración</strong> desde el dashboard</li>
            <li>Hacé clic en <strong>Eliminar cuenta</strong> y confirmá la acción</li>
          </ol>
          <p className="mt-4 text-gray-500">
            También podés enviar una solicitud por email a{" "}
            <a href="mailto:tdsdeveloper00@gmail.com" className="text-blue-600 underline">
              tdsdeveloper00@gmail.com
            </a>{" "}
            indicando tu dirección de correo registrada.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            ¿Qué datos se eliminan?
          </h2>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Cuenta de usuario (email y contraseña)</li>
            <li>Dispositivos vinculados</li>
            <li>Historial de notificaciones</li>
            <li>Configuración y datos del negocio</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Período de retención
          </h2>
          <p className="text-gray-600">
            Todos los datos se eliminan de forma permanente dentro de los{" "}
            <strong>30 días</strong> posteriores a la solicitud. No se conserva
            ningún dato después de ese plazo.
          </p>
        </section>
      </div>
    </main>
  );
}
