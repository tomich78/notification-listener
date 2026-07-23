"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Crown, Check, ArrowLeft, RefreshCw, CalendarCheck } from "lucide-react";
import { annualMonthlyPrice, annualTotalPrice, annualSavings, ANNUAL_DISCOUNT_PCT } from "@/lib/pricing";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PlanConfig {
  freeDeviceLimit: number;
  proDeviceLimit: number;
  freeNotifLimit: number;
  proPrice: number;
}

const DEFAULT_CONFIG: PlanConfig = {
  freeDeviceLimit: 1,
  proDeviceLimit: 5,
  freeNotifLimit: 100,
  proPrice: 2500,
};

export default function UpgradePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [planConfig, setPlanConfig] = useState<PlanConfig>(DEFAULT_CONFIG);
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");
  const [mode, setMode] = useState<"auto" | "manual">("auto");

  // Anual: se paga de una vez por año, con descuento sobre el precio mensual
  const annualMonthly = annualMonthlyPrice(planConfig.proPrice);
  const annualTotal = annualTotalPrice(planConfig.proPrice);
  const savings = annualSavings(planConfig.proPrice);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    Promise.all([
      getDoc(doc(db, "users", user.uid)),
      getDoc(doc(db, "config", "plans")),
    ]).then(([userSnap, configSnap]) => {
      if (userSnap.exists()) setUserPlan(userSnap.data().plan ?? "free");
      if (configSnap.exists()) setPlanConfig(configSnap.data() as PlanConfig);
    }).catch(() => {
      // Si falla Firestore usamos los defaults
    }).finally(() => {
      setLoading(false);
    });
  }, [user, authLoading, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (userPlan === "pro") return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <Crown className="w-12 h-12 text-purple-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Ya sos Pro!</h1>
        <p className="text-gray-500 mb-6">Tenés acceso a todas las funciones de NListener.</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
          Volver al dashboard
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-md mx-auto">
        <Link href="/dashboard/settings" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8">
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>

        <div className="text-center mb-8">
          <Crown className="w-10 h-10 text-purple-600 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-gray-900">Pasate a Pro</h1>
          <p className="text-gray-500 mt-1">Desbloqueá todo el potencial de NListener</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border-2 border-blue-600 p-6 mb-4 shadow-lg">
          {/* Modalidad de pago */}
          <p className="text-xs font-medium text-gray-500 mb-2">¿Cómo querés pagar?</p>
          <div className="space-y-2 mb-5">
            <button
              onClick={() => { setMode("auto"); setPeriod("monthly"); }}
              className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                mode === "auto" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${mode === "auto" ? "text-blue-600" : "text-gray-400"}`} />
                <span className="text-sm font-semibold text-gray-900">Débito automático</span>
                <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded ml-auto">
                  RECOMENDADO
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Se cobra solo todos los meses. No te quedás sin servicio por olvido.
                Lo cancelás cuando quieras desde tu cuenta.
              </p>
            </button>

            <button
              onClick={() => setMode("manual")}
              className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
                mode === "manual" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <CalendarCheck className={`w-4 h-4 ${mode === "manual" ? "text-blue-600" : "text-gray-400"}`} />
                <span className="text-sm font-semibold text-gray-900">Pago único</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Pagás una vez y listo. No se te cobra nada automáticamente:
                renovás vos cuando se venza.
              </p>
            </button>
          </div>

          {/* Período — solo para pago único */}
          {mode === "manual" && (
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
              <button
                onClick={() => setPeriod("monthly")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === "monthly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                1 mes
              </button>
              <button
                onClick={() => setPeriod("annual")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  period === "annual" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                1 año
                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  -{ANNUAL_DISCOUNT_PCT}%
                </span>
              </button>
            </div>
          )}

          <div className="flex items-end gap-1 mb-1">
            <span className="text-4xl font-bold text-gray-900">
              ${(period === "monthly" ? planConfig.proPrice : annualMonthly).toLocaleString("es-AR")}
            </span>
            <span className="text-gray-400 text-sm mb-1">/mes</span>
          </div>
          {period === "annual" ? (
            <p className="text-xs text-gray-400 mb-6">
              Un pago de <span className="font-semibold text-gray-600">${annualTotal.toLocaleString("es-AR")}</span> por
              12 meses · Ahorrás ${savings.toLocaleString("es-AR")}
            </p>
          ) : mode === "auto" ? (
            <p className="text-xs text-gray-400 mb-6">Se renueva solo cada mes · Cancelás cuando quieras</p>
          ) : (
            <p className="text-xs text-gray-400 mb-6">
              Un pago de <span className="font-semibold text-gray-600">${planConfig.proPrice.toLocaleString("es-AR")}</span> por
              1 mes · Sin cobros automáticos
            </p>
          )}

          <ul className="space-y-3 mb-6">
            {[
              `Hasta ${planConfig.proDeviceLimit} dispositivos Android`,
              "Notificaciones ilimitadas",
              "Modo sucursales",
              "Filtros y búsqueda avanzada",
              "Soporte prioritario",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={async () => {
              if (!user) return;
              setSubscribing(true);
              try {
                const token = await user.getIdToken();
                // Débito automático → suscripción recurrente.
                // Pago único → checkout de un solo pago, sin cobros futuros.
                const endpoint = mode === "auto" ? "/api/mp/subscribe" : "/api/mp/checkout";
                const res = await fetch(endpoint, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ period }),
                });
                const data = await res.json();
                if (data.init_point) {
                  window.location.href = data.init_point;
                } else {
                  alert("Error al iniciar el pago. Intentá de nuevo.");
                }
              } catch {
                alert("Error al conectar con MercadoPago.");
              } finally {
                setSubscribing(false);
              }
            }}
            disabled={subscribing}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {subscribing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Crown className="w-4 h-4" />
            )}
            {subscribing
              ? "Redirigiendo a MercadoPago..."
              : mode === "auto"
                ? "Activar débito automático"
                : period === "annual" ? "Pagar 1 año" : "Pagar 1 mes"}
          </button>
          <p className="text-[11px] text-gray-400 text-center mt-3">
            {mode === "auto"
              ? "Se cobra todos los meses automáticamente. Podés darte de baja desde Configuración en cualquier momento."
              : "Es un pago único: no se te va a cobrar nada de forma automática. Te avisamos por mail antes del vencimiento."}
          </p>
        </div>

        {/* Free comparison */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Tu plan actual · Free</p>
          <ul className="space-y-2">
            <li className="text-sm text-gray-500">· {planConfig.freeDeviceLimit} dispositivo</li>
            <li className="text-sm text-gray-500">· {planConfig.freeNotifLimit} notificaciones/mes</li>
            <li className="text-sm text-gray-300">· Sin modo sucursales</li>
          </ul>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿Preguntas? Escribinos a{" "}
          <a href="mailto:tdsdeveloper00@gmail.com" className="text-blue-600 hover:underline">
            tdsdeveloper00@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
