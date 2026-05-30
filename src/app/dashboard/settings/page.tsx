"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Copy, Check, ExternalLink, Share2, Smartphone, Globe } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function SettingsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [mpConnected, setMpConnected] = useState(false);
  const [mpLoading, setMpLoading] = useState(true);
  const [mpConnecting, setMpConnecting] = useState(false);

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/view/${user?.uid}`;

  // Escuchar el estado de MP desde Firestore
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const data = snap.data();
      setMpConnected(data?.mercadopago?.connected === true);
      setMpLoading(false);
    });
    return unsub;
  }, [user]);

  // Mostrar feedback después del redirect de OAuth
  const mpStatus = searchParams.get("mp");

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function connectMercadoPago() {
    if (!user) return;
    setMpConnecting(true);
    try {
      const token = await user.getIdToken();
      // Redirigir al flujo OAuth de MP
      window.location.href = `/api/auth/mercadopago?token=${token}`;
    } catch {
      setMpConnecting(false);
    }
  }

  async function disconnectMercadoPago() {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch("/api/auth/mercadopago/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // silencioso
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Administrá tu cuenta y tus integraciones.</p>
      </div>

      {/* Feedback OAuth */}
      {mpStatus === "connected" && (
        <div className="mb-5 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
          ✅ MercadoPago conectado correctamente.
        </div>
      )}
      {mpStatus === "error" && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          ❌ Error al conectar MercadoPago. Intentá de nuevo.
        </div>
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

      {/* Fuentes de cobros */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
        <h2 className="font-semibold text-sm text-gray-900 mb-4">Fuentes de cobros</h2>
        <div className="space-y-3">

          {/* Android */}
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

          {/* MercadoPago */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">MercadoPago</p>
                <p className="text-xs text-gray-400">
                  {mpLoading
                    ? "Verificando..."
                    : mpConnected
                    ? "Conectado — recibís pagos en tiempo real"
                    : "Conectá tu cuenta para recibir pagos sin celular"}
                </p>
              </div>
            </div>
            {!mpLoading && (
              mpConnected ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    Activo
                  </span>
                  <button
                    onClick={disconnectMercadoPago}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Desconectar
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectMercadoPago}
                  disabled={mpConnecting}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {mpConnecting ? "Conectando..." : "Conectar"}
                </button>
              )
            )}
          </div>

          {/* Webhook genérico — próximamente */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Globe className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Webhook personalizado</p>
                <p className="text-xs text-gray-400">Stripe, Ualá, Zapier y más</p>
              </div>
            </div>
            <span className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded-full">
              Próximamente
            </span>
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
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
              Free
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
