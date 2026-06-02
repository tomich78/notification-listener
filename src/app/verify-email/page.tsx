"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Mail, RefreshCw, LogOut } from "lucide-react";

export default function VerifyEmailPage() {
  const { user, logout, resendVerification } = useAuth();
  const router = useRouter();
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  // Si ya verificó, mandar al dashboard
  useEffect(() => {
    if (user?.emailVerified) router.push("/dashboard");
  }, [user, router]);

  async function handleResend() {
    setResending(true);
    try {
      await resendVerification();
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } finally {
      setResending(false);
    }
  }

  async function handleCheck() {
    setChecking(true);
    // Recargar el usuario para obtener el estado actualizado de emailVerified
    await user?.reload();
    if (user?.emailVerified) {
      router.push("/dashboard");
    } else {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image src="/logo.webp" alt="NListener" width={48} height={48} className="rounded-xl" />
          <span className="font-bold text-gray-900">NListener</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
              <Mail className="w-7 h-7 text-blue-600" />
            </div>
          </div>

          <h1 className="text-xl font-bold mb-2">Verificá tu email</h1>
          <p className="text-sm text-gray-500 mb-1">
            Te enviamos un link a
          </p>
          <p className="text-sm font-semibold text-gray-800 mb-6 break-all">
            {user?.email}
          </p>
          <p className="text-xs text-gray-400 mb-8">
            Hacé clic en el link del email para activar tu cuenta. Revisá también la carpeta de spam.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleCheck}
              disabled={checking}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {checking ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {checking ? "Verificando..." : "Ya verifiqué mi email"}
            </button>

            <button
              onClick={handleResend}
              disabled={resending || resent}
              className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {resent ? "✅ Email reenviado" : resending ? "Enviando..." : "Reenviar email"}
            </button>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center justify-center gap-1.5 w-full mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
