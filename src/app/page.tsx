import Link from "next/link";
import { Bell, Smartphone, Globe, Zap, Shield, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-900">NotificationListener</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Crear cuenta gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          Recibí tus cobros<br />en tiempo real
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Mostrá las transferencias recibidas a tus empleados sin darles acceso
          a tu cuenta bancaria. Conectá tu celular Android o integrá directamente
          con MercadoPago, Stripe y más.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Empezar gratis <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors font-medium text-gray-700"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-center mb-12">¿Cómo funciona?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Creá tu cuenta",
                desc: "Registrate gratis en menos de un minuto.",
              },
              {
                step: "2",
                title: "Conectá una fuente",
                desc: "Instalá la app Android o vinculá MercadoPago con un clic.",
              },
              {
                step: "3",
                title: "Compartí el link",
                desc: "Tu equipo ve los cobros en tiempo real desde cualquier dispositivo.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mx-auto mb-4 text-sm">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-center mb-12">Todo en un solo lugar</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              icon: <Smartphone className="w-5 h-5 text-blue-600" />,
              title: "App Android",
              desc: "Escuchá notificaciones de cualquier app bancaria directamente desde tu celular.",
            },
            {
              icon: <Globe className="w-5 h-5 text-blue-600" />,
              title: "Integraciones web",
              desc: "Conectá MercadoPago, Stripe, Ualá y más mediante webhooks. Sin celular.",
            },
            {
              icon: <Zap className="w-5 h-5 text-blue-600" />,
              title: "Tiempo real",
              desc: "Las notificaciones aparecen al instante. Sin recargar la página.",
            },
            {
              icon: <Shield className="w-5 h-5 text-blue-600" />,
              title: "Vista segura para empleados",
              desc: "Compartí un link de solo lectura. Tus empleados ven los cobros, nada más.",
            },
          ].map((f) => (
            <div key={f.title} className="flex gap-4 p-5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="mt-0.5">{f.icon}</div>
              <div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        NotificationListener © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
