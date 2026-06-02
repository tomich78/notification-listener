import Link from "next/link";
import Image from "next/image";
import { Smartphone, Globe, Zap, Shield, ArrowRight, Check, Store, Users, Lock, Bell } from "lucide-react";
import { getAdminDb } from "@/lib/firebase-admin";

async function getProPrice(): Promise<number> {
  try {
    const snap = await getAdminDb().collection("config").doc("plans").get();
    return snap.data()?.proPrice ?? 2500;
  } catch {
    return 2500;
  }
}

export default async function LandingPage() {
  const proPrice = await getProPrice();
  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="NListener" width={28} height={28} className="rounded-lg" />
            <span className="font-bold text-gray-900">NListener</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Empezar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-20 md:py-28 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full text-xs font-medium text-blue-600 mb-6">
          <Zap className="w-3.5 h-3.5" />
          Cobros en tiempo real para negocios
        </div>
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
          Tus empleados ven los cobros.<br />
          <span className="text-blue-600">Sin ver tu cuenta bancaria.</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          NListener captura las notificaciones de transferencias de tu celular Android y
          las muestra en una pantalla de solo lectura para tu equipo. Sin apps extra, sin acceso a tu banco.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/register"
            className="flex items-center gap-2 bg-blue-600 text-white px-7 py-3.5 rounded-xl hover:bg-blue-700 transition-colors font-semibold text-sm w-full sm:w-auto justify-center"
          >
            Crear cuenta gratis <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="px-7 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors font-semibold text-sm text-gray-600 w-full sm:w-auto text-center"
          >
            Ya tengo cuenta
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">Sin tarjeta. Plan gratuito para siempre.</p>
      </section>

      {/* Mock pantalla */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="bg-gray-900 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          <div className="bg-white rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-gray-400">Total del día</p>
                <p className="text-2xl font-bold text-gray-900">$47.500</p>
              </div>
              <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">● En vivo</span>
            </div>
            {[
              { app: "Mercado Pago", text: "Recibiste $12.000 de Carlos M.", time: "hace 2 min", color: "bg-blue-100 text-blue-700" },
              { app: "Banco Galicia", text: "Transferencia recibida $8.500", time: "hace 15 min", color: "bg-green-100 text-green-700" },
              { app: "Mercado Pago", text: "Recibiste $27.000 de Ana R.", time: "hace 1 h", color: "bg-blue-100 text-blue-700" },
            ].map((n, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${n.color}`}>{n.app}</span>
                  <span className="text-sm text-gray-700">{n.text}</span>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{n.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Para quién */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Pensado para negocios con empleados</h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto text-sm">
            Si tu negocio recibe transferencias y tenés gente en el mostrador que necesita confirmar pagos, NListener es para vos.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <Store className="w-5 h-5 text-blue-600" />, title: "Locales y kioscos", desc: "El cajero confirma el pago sin tocar tu teléfono ni acceder a tu cuenta." },
              { icon: <Users className="w-5 h-5 text-blue-600" />, title: "Negocios con sucursales", desc: "Cada sucursal ve solo sus propios cobros. Plan Pro incluye múltiples sucursales." },
              { icon: <Lock className="w-5 h-5 text-blue-600" />, title: "Emprendedores", desc: "Tu información bancaria queda privada. Compartís solo lo necesario." },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Listo en 3 pasos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: "1", icon: <Bell className="w-6 h-6 text-blue-600" />, title: "Creá tu cuenta", desc: "Registrate gratis. No hace falta tarjeta ni configuración técnica." },
            { step: "2", icon: <Smartphone className="w-6 h-6 text-blue-600" />, title: "Conectá el celular", desc: "Instalá NListener en el Android donde llegan las notificaciones de transferencias y escaneá el QR." },
            { step: "3", icon: <Globe className="w-6 h-6 text-blue-600" />, title: "Compartí el link", desc: "Mandále a tus empleados el link de tu panel. Ven los cobros al instante." },
          ].map((item) => (
            <div key={item.step} className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                {item.icon}
              </div>
              <div className="text-xs font-bold text-blue-400 mb-1">PASO {item.step}</div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">Todo lo que necesitás</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: <Smartphone className="w-4 h-4 text-blue-600" />, title: "App Android", desc: "Captura notificaciones de cualquier banco o billetera sin configuración extra." },
              { icon: <Globe className="w-4 h-4 text-blue-600" />, title: "Compatible con cualquier banco", desc: "Funciona con MercadoPago, Naranja X, Ualá, Brubank, Galicia, Santander y más." },
              { icon: <Zap className="w-4 h-4 text-blue-600" />, title: "Actualización en tiempo real", desc: "Los cobros aparecen en segundos. Sin recargar la pantalla." },
              { icon: <Shield className="w-4 h-4 text-blue-600" />, title: "Vista de solo lectura", desc: "El link para empleados no permite modificar nada. Solo ver. Con contraseña opcional." },
              { icon: <Users className="w-4 h-4 text-blue-600" />, title: "Modo sucursales", desc: "Asigná cada cobro a una sucursal. Cada empleado ve solo lo suyo. (Pro)" },
              { icon: <Bell className="w-4 h-4 text-blue-600" />, title: "Historial completo", desc: "Buscá y filtrá todos tus cobros por fecha, monto o texto." },
            ].map((f) => (
              <div key={f.title} className="flex gap-4 p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-200 transition-colors">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Precios */}
      <section className="max-w-5xl mx-auto px-6 py-20" id="precios">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-3">Precios simples</h2>
        <p className="text-center text-gray-500 mb-12 text-sm">Sin sorpresas. Cancelás cuando querés.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">

          {/* Free */}
          <div className="bg-white rounded-2xl border border-gray-200 p-7">
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-500 mb-1">Free</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$0</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Para siempre</p>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "1 dispositivo Android",
                "Hasta 100 cobros por mes",
                "Vista pública para empleados",
                "Integración MercadoPago",
                "Historial completo",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="block w-full text-center py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Empezar gratis
            </Link>
          </div>

          {/* Pro */}
          <div className="bg-blue-600 rounded-2xl p-7 text-white relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              RECOMENDADO
            </div>
            <div className="mb-6">
              <p className="text-sm font-medium text-blue-200 mb-1">Pro</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">${proPrice.toLocaleString("es-AR")}</span>
                <span className="text-blue-300 text-sm">/mes</span>
              </div>
              <p className="text-xs text-blue-300 mt-1">Pesos argentinos · MercadoPago</p>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "Hasta 5 dispositivos Android",
                "Cobros ilimitados",
                "Modo sucursales con colores",
                "Totales por sucursal",
                "Vista con contraseña por sucursal",
                "Todo lo del plan Free",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-white">
                  <Check className="w-4 h-4 text-blue-200 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/upgrade"
              className="block w-full text-center py-2.5 bg-white text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors"
            >
              Suscribirse ahora
            </Link>
          </div>

        </div>
      </section>

      {/* CTA final */}
      <section className="bg-blue-600 py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Empezá hoy. Es gratis.
          </h2>
          <p className="text-blue-200 mb-8 text-sm">
            En menos de 5 minutos tu equipo puede confirmar cobros desde cualquier pantalla.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors"
          >
            Crear cuenta gratis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="NListener" width={22} height={22} className="rounded-md" />
            <span className="font-medium text-gray-600">NListener</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-gray-600 transition-colors">Privacidad</Link>
            <Link href="/login" className="hover:text-gray-600 transition-colors">Iniciar sesión</Link>
            <Link href="/register" className="hover:text-gray-600 transition-colors">Registrarse</Link>
          </div>
          <span>© {new Date().getFullYear()} NListener</span>
        </div>
      </footer>

    </div>
  );
}
