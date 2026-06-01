"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, Timestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Device } from "@/lib/types";
import { Smartphone, Plus, Trash2, Wifi, WifiOff, X, Crown } from "lucide-react";
import QRCode from "react-qr-code";

interface PlanConfig { freeDeviceLimit: number; proDeviceLimit: number }
const DEFAULT_CONFIG: PlanConfig = { freeDeviceLimit: 1, proDeviceLimit: 5 };

export default function DevicesPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [qrData, setQrData] = useState<{ name: string; payload: string } | null>(null);
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");
  const [planConfig, setPlanConfig] = useState<PlanConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDoc(doc(db, "users", user.uid)),
      getDoc(doc(db, "config", "plans")),
    ]).then(([userSnap, configSnap]) => {
      if (userSnap.exists()) setUserPlan(userSnap.data().plan ?? "free");
      if (configSnap.exists()) setPlanConfig(configSnap.data() as PlanConfig);
    }).catch(() => {});
    const q = query(
      collection(db, "devices"),
      where("userId", "==", user.uid),
      where("active", "==", true)
    );
    return onSnapshot(q, (snap) => {
      setDevices(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Device[]);
      setLoading(false);
    });
  }, [user]);

  const deviceLimit = userPlan === "pro" ? planConfig.proDeviceLimit : planConfig.freeDeviceLimit;
  const atLimit = devices.length >= deviceLimit;

  async function addDevice() {
    if (!user || !newDeviceName.trim()) return;
    setAdding(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ name: newDeviceName.trim() }),
      });
      const data = await res.json();
      // El payload del QR contiene la URL del servidor + el token
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const payload = JSON.stringify({ url: appUrl, token: data.token });
      setQrData({ name: newDeviceName.trim(), payload });
      setNewDeviceName("");
    } finally {
      setAdding(false);
    }
  }

  async function removeDevice(deviceId: string) {
    if (!user) return;
    const idToken = await user.getIdToken();
    await fetch(`/api/devices?id=${deviceId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${idToken}` },
    });
  }

  function isOnline(lastSeen: Timestamp | null): boolean {
    if (!lastSeen) return false;
    return Date.now() - lastSeen.toDate().getTime() < 5 * 60 * 1000;
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dispositivos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Administrá los celulares Android conectados a tu cuenta.{" "}
          <span className="text-gray-400">({devices.length}/{deviceLimit} usados)</span>
        </p>
      </div>

      {/* Agregar dispositivo */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <h2 className="font-semibold text-sm mb-4">Agregar dispositivo</h2>
        {atLimit ? (
          <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div>
              <p className="text-sm font-medium text-amber-800">Límite de dispositivos alcanzado</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Tu plan {userPlan === "free" ? "Free" : "Pro"} permite hasta {deviceLimit} dispositivo{deviceLimit > 1 ? "s" : ""}.
              </p>
            </div>
            {userPlan === "free" && (
              <a
                href="/upgrade"
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0 ml-4"
              >
                <Crown className="w-3.5 h-3.5" />
                Mejorar plan
              </a>
            )}
          </div>
        ) : (
          <div className="flex gap-3">
            <input
              type="text"
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
              placeholder="Ej: Celular del local"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === "Enter" && addDevice()}
            />
            <button
              onClick={addDevice}
              disabled={adding || !newDeviceName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {adding ? "Creando..." : "Agregar"}
            </button>
          </div>
        )}
      </div>

      {/* Modal QR */}
      {qrData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-gray-900">¡Dispositivo creado!</h3>
                <p className="text-sm text-gray-500">{qrData.name}</p>
              </div>
              <button
                onClick={() => setQrData(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code */}
            <div className="flex justify-center p-4 bg-white border-2 border-gray-100 rounded-xl mb-6">
              <QRCode value={qrData.payload} size={200} />
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Escaneá este QR desde la app Android
              </p>
              <p className="text-xs text-gray-400">
                Abrí NListener → Configurar → Escanear código QR
              </p>
            </div>

            <button
              onClick={() => setQrData(null)}
              className="w-full mt-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      {/* Lista de dispositivos */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-sm text-gray-900">Dispositivos activos</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Smartphone className="w-8 h-8 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No hay dispositivos. Agregá uno arriba.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {devices.map((d) => {
              const online = isOnline(d.lastSeen);
              return (
                <li key={d.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{d.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {online
                          ? <Wifi className="w-3 h-3 text-green-500" />
                          : <WifiOff className="w-3 h-3 text-gray-300" />}
                        <span className={`text-xs ${online ? "text-green-600" : "text-gray-400"}`}>
                          {online ? "Activo" : d.lastSeen
                            ? `Último: ${new Intl.DateTimeFormat("es-AR", {
                                day: "2-digit", month: "2-digit",
                                hour: "2-digit", minute: "2-digit"
                              }).format(d.lastSeen.toDate())}`
                            : "Nunca conectado"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeDevice(d.id)}
                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
