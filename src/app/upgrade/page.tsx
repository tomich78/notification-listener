"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Crown, Check, ArrowLeft } from "lucide-react";
import Link from "next/link";

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
  const { user } = useAuth();
  const [planConfig, setPlanConfig] = useState<PlanConfig>(DEFAULT_CONFIG);
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDoc(doc(db, "users", user.uid)),
      getDoc(doc(db, "config", "plans")),
    ]).then(([userSnap, configSnap]) => {
      if (userSnap.exists()) setUserPlan(userSnap.data().plan ?? "free");
      if (configSnap.exists()) setPlanConfig(configSnap.data() as PlanConfig);
      setLoading(false);
    });
  }, [user]);

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
          <div className="flex items-end gap-1 mb-1">
            <span className="text-4xl font-bold text-gray-900">
              ${planConfig.proPrice.toLocaleString("es-AR")}
            </span>
            <span className="text-gray-400 text-sm mb-1">/mes</span>
          </div>
          <p className="text-xs text-gray-400 mb-6">Pago mensual · Cancelá cuando quieras</p>

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
            onClick={() => alert("Próximamente — integración con MercadoPago")}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" />
            Suscribirme ahora
          </button>
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
