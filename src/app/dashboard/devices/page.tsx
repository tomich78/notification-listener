"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, Timestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Device } from "@/lib/types";
import { Smartphone, Plus, Trash2, Wifi, WifiOff, X, Crown, FlaskConical, CheckCircle, AlertCircle, RefreshCw, PowerOff, Power } from "lucide-react";
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
  const [testState, setTestState] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [reconnectState, setReconnectState] = useState<Record<string, "idle" | "sending" | "ok" | "error">>({});
  const [togglingDevice, setTogglingDevice] = useState<string | null>(null);

  // Modal confirmación eliminar
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingDevice, setDeletingDevice] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDoc(doc(db, "users", user.uid)),
      getDoc(doc(db, "config", "plans")),
    ]).then(([userSnap, configSnap]) => {
      if (userSnap.exists()) setUserPlan(userSnap.data().plan ?? "free");
      if (configSnap.exists()) setPlanConfig(configSnap.data() as PlanConfig);
    }).catch(() => {});

    // Traemos TODOS los dispositivos del usuario (activos e inactivos)
    const q = query(
      collection(db, "devices"),
      where("userId", "==", user.uid)
    );
    return onSnapshot(q, (snap) => {
      setDevices(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Device[]);
      setLoading(false);
    });
  }, [user]);

  const activeDevices = devices.filter((d) => d.active);
  const deviceLimit = userPlan === "pro" ? planConfig.proDeviceLimit : planConfig.freeDeviceLimit;
  const atLimit = activeDevices.length >= deviceLimit;

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
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
      const payload = JSON.stringify({ url: appUrl, token: data.token });
      setQrData({ name: newDeviceName.trim(), payload });
      setNewDeviceName("");
    } finally {
      setAdding(false);
    }
  }

  async function toggleDevice(deviceId: string, currentActive: boolean) {
    if (!user) return;
    setTogglingDevice(deviceId);
    try {
      const idToken = await user.getIdToken();
      await fetch(`/api/devices?id=${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ active: !currentActive }),
      });
    } finally {
      setTogglingDevice(null);
    }
  }

  async function deleteDevice(deviceId: string) {
    if (!user) return;
    setDeletingDevice(true);
    try {
      const idToken = await user.getIdToken();
      await fetch(`/api/devices?id=${deviceId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setConfirmDelete(null);
    } finally {
      setDeletingDevice(false);
    }
  }

  async function sendTestNotification() {
    if (!user) return;
    setTestState("sending");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/test-notification", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setTestState(res.ok ? "ok" : "error");
    } catch {
      setTestState("error");
    } finally {
      setTimeout(() => setTestState("idle"), 4000);
    }
  }

  async function reconnectDevice(deviceId: string) {
    if (!user) return;
    setReconnectState((s) => ({ ...s, [deviceId]: "sending" }));
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/devices/reconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ deviceId }),
      });
      setReconnectState((s) => ({ ...s, [deviceId]: res.ok ? "ok" : "error" }));
    } catch {
      setReconnectState((s) => ({ ...s, [deviceId]: "error" }));
    } finally {
      setTimeout(() => setReconnectState((s) => ({ ...s, [deviceId]: "idle" })), 4000);
    }
  }

  function isOnline(lastSeen: Timestamp | null): boolean {
    if (!lastSeen) return false;
    // Consideramos online si el heartbeat llegó en los últimos 10 minutos
    // (el KeepAliveService manda heartbeat cada ~4 minutos)
    return Date.now() - lastSeen.toDate().getTime() < 10 * 60 * 1000;
  }

  function lastSeenText(lastSeen: Timestamp | null): string {
    if (!lastSeen) return "Nunca conectado";
    const diff = Date.now() - lastSeen.toDate().getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "Ahora mismo";
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${Math.floor(hours / 24)}d`;
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dispositivos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Administrá los celulares Android conectados a tu cuenta.{" "}
          <span className="text-gray-400">({activeDevices.length}/{deviceLimit} activos)</span>
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
                Tu plan {userPlan === "free" ? "Free" : "Pro"} permite hasta {deviceLimit} dispositivo{deviceLimit > 1 ? "s" : ""} activo{deviceLimit > 1 ? "s" : ""}.
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
              <button onClick={() => setQrData(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex justify-center p-4 bg-white border-2 border-gray-100 rounded-xl mb-6">
              <QRCode value={qrData.payload} size={200} />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-gray-700">Escaneá este QR desde la app Android</p>
              <p className="text-xs text-gray-400">Abrí NListener → Configurar → Escanear código QR</p>
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

      {/* Panel de prueba de conexión */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-sm mb-1">Probar conexión</h2>
            <p className="text-xs text-gray-500">
              Enviá una notificación de prueba para verificar que el sistema está recibiendo datos correctamente.
            </p>
          </div>
          <button
            onClick={sendTestNotification}
            disabled={testState === "sending"}
            className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {testState === "sending" ? (
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FlaskConical className="w-4 h-4" />
            )}
            {testState === "sending" ? "Enviando..." : "Enviar prueba"}
          </button>
        </div>
        {testState === "ok" && (
          <div className="flex items-center gap-2 mt-3 p-3 bg-green-50 border border-green-100 rounded-xl">
            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            <p className="text-xs text-green-700 font-medium">¡Notificación enviada! Revisá el dashboard.</p>
          </div>
        )}
        {testState === "error" && (
          <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 border border-red-100 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700 font-medium">No se pudo enviar. Revisá tu conexión.</p>
          </div>
        )}
      </div>

      {/* Lista de dispositivos */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-sm text-gray-900">Dispositivos</h2>
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
              const online = d.active && isOnline(d.lastSeen);
              return (
                <li key={d.id} className={`flex items-center justify-between px-5 py-4 ${!d.active ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${d.active ? "bg-gray-100" : "bg-gray-50"}`}>
                      <Smartphone className={`w-4 h-4 ${d.active ? "text-gray-500" : "text-gray-300"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">{d.name}</p>
                        {!d.active && (
                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactivo</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {!d.active ? (
                          <WifiOff className="w-3 h-3 text-gray-300" />
                        ) : online ? (
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        ) : (
                          <WifiOff className="w-3 h-3 text-gray-300" />
                        )}
                        <span className={`text-xs ${online ? "text-green-600 font-medium" : "text-gray-400"}`}>
                          {!d.active
                            ? "Desactivado"
                            : online
                            ? `Conectado · ${lastSeenText(d.lastSeen)}`
                            : `Desconectado · ${lastSeenText(d.lastSeen)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Reconectar — solo si activo y offline */}
                    {d.active && !online && (
                      <button
                        onClick={() => reconnectDevice(d.id)}
                        disabled={reconnectState[d.id] === "sending"}
                        title="Reconectar dispositivo"
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          reconnectState[d.id] === "ok"
                            ? "bg-green-100 text-green-700"
                            : reconnectState[d.id] === "error"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                        } disabled:opacity-50`}
                      >
                        {reconnectState[d.id] === "sending" ? (
                          <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        ) : reconnectState[d.id] === "ok" ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : reconnectState[d.id] === "error" ? (
                          <AlertCircle className="w-3.5 h-3.5" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        {reconnectState[d.id] === "ok" ? "Enviado" : reconnectState[d.id] === "error" ? "Sin FCM" : reconnectState[d.id] === "sending" ? "..." : "Reconectar"}
                      </button>
                    )}

                    {/* Activar / Desactivar */}
                    <button
                      onClick={() => toggleDevice(d.id, d.active)}
                      disabled={togglingDevice === d.id}
                      title={d.active ? "Desactivar dispositivo" : "Activar dispositivo"}
                      className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                        d.active
                          ? "text-gray-300 hover:text-yellow-500 hover:bg-yellow-50"
                          : "text-gray-300 hover:text-green-500 hover:bg-green-50"
                      }`}
                    >
                      {togglingDevice === d.id ? (
                        <span className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin block" />
                      ) : d.active ? (
                        <PowerOff className="w-4 h-4" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </button>

                    {/* Eliminar */}
                    <button
                      onClick={() => setConfirmDelete({ id: d.id, name: d.name })}
                      title="Eliminar dispositivo"
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modal confirmar eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Eliminar dispositivo</h3>
                <p className="text-sm text-gray-500">
                  ¿Querés eliminar <span className="font-medium text-gray-700">"{confirmDelete.name}"</span> de forma permanente? Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deletingDevice}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteDevice(confirmDelete.id)}
                disabled={deletingDevice}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingDevice ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
