"use client";

import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Copy, Check, ExternalLink, Share2, Smartphone, Globe, Zap, Crown } from "lucide-react";

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

export default function SettingsPage() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");
  const [planConfig, setPlanConfig] = useState<PlanConfig>(DEFAULT_CONFIG);
  const [loadingPlan, setLoadingPlan] = useState(true);

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/view/${user?.uid}`;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDoc(doc(db, "users", user.uid)),
      getDoc(doc(db, "config", "plans")),
    ]).then(([userSnap, configSnap]) => {
      if (userSnap.exists()) setUserPlan(userSnap.data().plan ?? "free");
      if (configSnap.exists()) setPlanConfig(configSnap.data() as PlanConfig);
    }).catch(() => {}).finally(() => setLoadingPlan(false));
  }, [user]);

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isPro = userPlan === "pro";

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Administrá tu cuenta y tus integraciones.</p>
      </div>

      {/* Plan actual */}
      {!loadingPlan && (
        isPro ? (
          <section className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-5 mb-5 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4" />
              <h2 className="font-semibold text-sm">Plan Pro</h2>
            </div>
            <p className="text-xs text-white/70">
              Hasta {planConfig.proDeviceLimit} dispositivos · Notificaciones ilimitadas
            </p>
          </section>
        ) : (
          <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-gray-400" />
                  <h2 className="font-semibold text-sm text-gray-900">Plan Free</h2>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  {planConfig.freeDeviceLimit} dispositivo · {planConfig.freeNotifLimit} notificaciones/mes
                </p>
                <div className="space-y-1.5 text-xs text-gray-500">
                  <p>✓ {planConfig.freeDeviceLimit} dispositivo Android</p>
                  <p>✓ {planConfig.freeNotifLimit} notificaciones por mes</p>
                  <p className="text-gray-300">✗ Múltiples dispositivos</p>
                  <p className="text-gray-300">✗ Notificaciones ilimitadas</p>
                  <p className="text-gray-300">✗ Modo sucursales</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  ${planConfig.proPrice.toLocaleString("es-AR")}
                  <span className="text-sm font-normal text-gray-400">/mes</span>
                </p>
                <p className="text-xs text-gray-400 mb-3">para Plan Pro</p>
                <a
                  href="/upgrade"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Crown className="w-3.5 h-3.5" />
                  Pasarme a Pro
                </a>
              </div>
            </div>
          </section>
        )
      )}

      {/* Vista pública */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Share2 className="w-4 h-4 text-blue-600" />
          <h2 className="font-semibold text-sm text-gray-900">Vista pública para empleados</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Compartí este link con tu equipo. Solo pueden ver los cobros de hoy, sin acceso a tu cuenta.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-700 truncate">
            {publicUrl}
          </code>
          <button
            onClick={copyLink}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-2.5 border border-gray-200 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </section>

      {/* Fuentes */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
        <h2 className="font-semibold text-sm text-gray-900 mb-4">Fuentes de cobros</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">App Android</p>
                <p className="text-xs text-gray-400">Escucha notificaciones bancarias</p>
              </div>
            </div>
            <a href="/dashboard/devices" className="text-xs text-blue-600 hover:underline font-medium">
              Gestionar →
            </a>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Integraciones web</p>
                <p className="text-xs text-gray-400">MercadoPago, Stripe, Ualá y más</p>
              </div>
            </div>
            <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full">Próximamente</span>
          </div>
        </div>
      </section>

      {/* Cuenta */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5">
        <h2 className="font-semibold text-sm text-gray-900 mb-4">Cuenta</h2>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Email</span>
            <span className="text-gray-700 font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Plan</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              isPro ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
            }`}>
              {isPro ? "Pro" : "Free"}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">ID de usuario</span>
            <code className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
              {user?.uid.slice(0, 12)}...
            </code>
          </div>
        </div>
      </section>
    </div>
  );
}
