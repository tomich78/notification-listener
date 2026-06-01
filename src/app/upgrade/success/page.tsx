"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Crown, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function UpgradeSuccessPage() {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          window.location.href = "/dashboard/settings";
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Bienvenido a Pro!</h1>
        <p className="text-gray-500 mb-2">
          Tu suscripción está siendo procesada. En unos minutos tu cuenta se actualizará automáticamente.
        </p>
        {user && (
          <p className="text-sm text-gray-400 mb-8">{user.email}</p>
        )}
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          Ir a mi cuenta
          <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-xs text-gray-400 mt-4">
          Redirigiendo en {countdown}s...
        </p>
      </div>
    </div>
  );
}
