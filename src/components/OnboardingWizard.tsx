"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Bell, Smartphone, CheckCircle, ArrowRight, X } from "lucide-react";
import QRCode from "react-qr-code";

interface Props {
  onDone: () => void;
}

type Step = 1 | 2 | 3;

export default function OnboardingWizard({ onDone }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [deviceName, setDeviceName] = useState("");
  const [creating, setCreating] = useState(false);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleCreateDevice() {
    if (!user || !deviceName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ name: deviceName.trim() }),
      });
      if (!res.ok) {
        setError("No se pudo crear el dispositivo. Intentá de nuevo.");
        return;
      }
      const data = await res.json();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      setQrPayload(JSON.stringify({ url: appUrl, token: data.token }));
      setStep(2);
    } finally {
      setCreating(false);
    }
  }

  function handleDone() {
    if (user) {
      localStorage.setItem(`nlistener_onboarding_done_${user.uid}`, "1");
    }
    onDone();
  }

  const STEPS = [
    { n: 1, label: "Dispositivo" },
    { n: 2, label: "Escanear QR" },
    { n: 3, label: "¡Listo!" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900 text-sm">Configuración inicial</span>
            </div>
            <button
              onClick={handleDone}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                  step > s.n ? "bg-green-500 text-white" :
                  step === s.n ? "bg-blue-600 text-white" :
                  "bg-gray-100 text-gray-400"
                }`}>
                  {step > s.n ? "✓" : s.n}
                </div>
                <span className={`text-xs hidden sm:block ${step === s.n ? "text-gray-900 font-medium" : "text-gray-400"}`}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px ${step > s.n ? "bg-green-300" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Step 1 */}
          {step === 1 && (
            <div>
              <div className="mb-5">
                <h2 className="text-lg font-bold text-gray-900 mb-1">¡Bienvenido a NListener!</h2>
                <p className="text-sm text-gray-500">
                  En 3 pasos vas a estar recibiendo cobros en tiempo real. Primero, ponele un nombre al celular que va a escuchar las notificaciones.
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre del dispositivo
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateDevice()}
                  placeholder="Ej: Celular del local"
                  maxLength={60}
                  autoFocus
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
              </div>

              <button
                onClick={handleCreateDevice}
                disabled={creating || !deviceName.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {creating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creando...
                  </span>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && qrPayload && (
            <div>
              <div className="mb-5">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Escaneá el código QR</h2>
                <p className="text-sm text-gray-500">
                  Abrí la app <strong>NListener</strong> en el celular Android, tocá <em>Configurar</em> y escaneá este código.
                </p>
              </div>

              <div className="flex justify-center p-5 bg-gray-50 border border-gray-100 rounded-xl mb-5">
                <QRCode value={qrPayload} size={180} />
              </div>

              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl mb-5">
                <Smartphone className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <ol className="text-xs text-blue-700 space-y-0.5 list-decimal list-inside">
                  <li>Instalá NListener en el celular Android</li>
                  <li>Abrí la app y tocá <strong>Configurar</strong></li>
                  <li>Tocá <strong>Escanear código QR</strong></li>
                  <li>Apuntá la cámara a este código</li>
                </ol>
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Ya escaneé el QR
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">¡Todo listo!</h2>
              <p className="text-sm text-gray-500 mb-6">
                Tu dispositivo está configurado. Cuando llegue una transferencia al celular, vas a verla acá en tiempo real.
              </p>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDone}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Ir al dashboard
                </button>
                <a
                  href={`/view/${user?.uid}`}
                  target="_blank"
                  className="w-full py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors block text-center"
                >
                  Ver página pública para empleados
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
