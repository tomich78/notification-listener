"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch {
      setError("No se encontró una cuenta con ese email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image src="/logo.webp" alt="NListener" width={48} height={48} className="rounded-xl" />
          <span className="font-bold text-gray-900">NListener</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8">
          {sent ? (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
              </div>
              <h1 className="text-lg font-bold mb-2">¡Revisá tu email!</h1>
              <p className="text-sm text-gray-500 mb-6">
                Te enviamos un link para restablecer tu contraseña a <strong>{email}</strong>.
              </p>
              <Link
                href="/login"
                className="block w-full text-center py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Volver al login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-2">Restablecer contraseña</h1>
              <p className="text-sm text-gray-500 mb-6">
                Ingresá tu email y te enviamos un link para crear una nueva contraseña.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="tu@email.com"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar link"}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            ← Volver al login
          </Link>
        </p>
      </div>
    </div>
  );
}
