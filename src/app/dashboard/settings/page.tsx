"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Copy, Check, ExternalLink, Share2, Smartphone, Globe, Zap, Crown, GitBranch, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { BranchConfig } from "@/lib/types";
import { checkPlanExpiry } from "@/lib/utils";

const BRANCH_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316",
];

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
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");
  const [planExpiresAt, setPlanExpiresAt] = useState<Date | null>(null);
  const [planConfig, setPlanConfig] = useState<PlanConfig>(DEFAULT_CONFIG);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [billingMode, setBillingMode] = useState<"auto" | "manual" | null>(null);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [branchConfig, setBranchConfig] = useState<BranchConfig>({
    enabled: false,
    password: "",
    branches: [],
  });
  const [savingBranch, setSavingBranch] = useState(false);
  const [savedBranch, setSavedBranch] = useState(false);

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/view/${user?.uid}`;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getDoc(doc(db, "users", user.uid)),
      getDoc(doc(db, "config", "plans")),
    ]).then(async ([userSnap, configSnap]) => {
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserPlan(await checkPlanExpiry(db, user.uid, data));
        setPlanExpiresAt(data.planExpiresAt?.toDate?.() ?? null);
        setBillingMode(data.billingMode ?? (data.mpSubscriptionId ? "auto" : null));
        setPaymentFailed(data.mpLastPaymentFailed === true);
        if (data.branchConfig) setBranchConfig(data.branchConfig);
      }
      if (configSnap.exists()) setPlanConfig(configSnap.data() as PlanConfig);
    }).catch(() => {}).finally(() => setLoadingPlan(false));
  }, [user]);

  function addBranch() {
    if (branchConfig.branches.length >= 8) return;
    const id = crypto.randomUUID();
    const color = BRANCH_COLORS[branchConfig.branches.length % BRANCH_COLORS.length];
    setBranchConfig(prev => ({
      ...prev,
      branches: [...prev.branches, { id, name: "", color }],
    }));
  }

  function removeBranch(id: string) {
    setBranchConfig(prev => ({
      ...prev,
      branches: prev.branches.filter(b => b.id !== id),
    }));
  }

  function updateBranchName(id: string, name: string) {
    setBranchConfig(prev => ({
      ...prev,
      branches: prev.branches.map(b => b.id === id ? { ...b, name } : b),
    }));
  }

  async function saveBranchConfig() {
    if (!user) return;
    setSavingBranch(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { branchConfig });
      setSavedBranch(true);
      setTimeout(() => setSavedBranch(false), 2000);
    } catch (e) {
      console.error("Error guardando sucursales:", e);
      alert("Error al guardar. Intentá de nuevo.");
    } finally {
      setSavingBranch(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    setDeletingAccount(true);
    setDeleteError("");
    try {
      await deleteUser(auth.currentUser!);
      router.push("/");
    } catch (e: unknown) {
      // Si el token expiró, Firebase pide reautenticación
      if (e instanceof Error && e.message.includes("requires-recent-login")) {
        setDeleteError("Por seguridad, cerrá sesión, volvé a iniciar sesión y luego eliminá la cuenta.");
      } else {
        setDeleteError("Ocurrió un error. Intentá de nuevo.");
      }
      setDeletingAccount(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function redeemCoupon() {
    if (!user || !couponCode.trim() || redeeming) return;
    setRedeeming(true);
    setRedeemMsg(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/coupons/redeem", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRedeemMsg({ type: "error", text: data.error ?? "Error al canjear el cupón" });
      } else {
        setUserPlan("pro");
        setPlanExpiresAt(new Date(data.expiresAt));
        setCouponCode("");
        setRedeemMsg({ type: "ok", text: "¡Listo! Tenés Plan Pro activado." });
      }
    } catch {
      setRedeemMsg({ type: "error", text: "Error de conexión. Intentá de nuevo." });
    } finally {
      setRedeeming(false);
    }
  }

  async function cancelSubscription() {
    if (!user || cancelling) return;
    setCancelling(true);
    setCancelMsg(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/mp/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelMsg({ type: "error", text: data.error ?? "No pudimos cancelar la suscripción." });
      } else {
        const until = new Date(data.accessUntil);
        setBillingMode("manual");
        setPlanExpiresAt(until);
        setShowCancelConfirm(false);
        setCancelMsg({
          type: "ok",
          text: `Listo, no se te va a cobrar más. Mantenés el Plan Pro hasta el ${until.toLocaleDateString("es-AR")}.`,
        });
      }
    } catch {
      setCancelMsg({ type: "error", text: "Error de conexión. Intentá de nuevo." });
    } finally {
      setCancelling(false);
    }
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
          <section className="rounded-2xl mb-5 overflow-hidden border border-gray-200">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4" />
                <h2 className="font-semibold text-sm">Plan Pro</h2>
              </div>
              <p className="text-xs text-white/70">
                Hasta {planConfig.proDeviceLimit} dispositivos · Notificaciones ilimitadas
              </p>
              <p className="text-xs text-white/70 mt-1">
                {billingMode === "auto"
                  ? "Débito automático activo · se renueva solo cada mes"
                  : planExpiresAt
                    ? `Acceso hasta el ${planExpiresAt.toLocaleDateString("es-AR")}`
                    : "Activo"}
              </p>
            </div>

            {/* Gestión del pago */}
            <div className="bg-white p-4">
              {paymentFailed && (
                <div className="flex items-start gap-2 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    No pudimos procesar tu último pago. MercadoPago va a reintentarlo en los
                    próximos días. Revisá el medio de pago para no perder el acceso.
                  </p>
                </div>
              )}

              {cancelMsg && (
                <p className={`text-xs mb-3 ${cancelMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                  {cancelMsg.text}
                </p>
              )}

              {billingMode === "auto" ? (
                showCancelConfirm ? (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-xs text-gray-700 mb-3">
                      Si das de baja el débito automático no se te cobra más, y seguís con el
                      Plan Pro hasta que termine el período que ya pagaste.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={cancelSubscription}
                        disabled={cancelling}
                        className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {cancelling ? "Cancelando..." : "Sí, dar de baja"}
                      </button>
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        disabled={cancelling}
                        className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Mantener suscripción
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-gray-500">
                      Tu suscripción se renueva automáticamente todos los meses.
                    </p>
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="text-xs text-gray-400 hover:text-red-600 transition-colors flex-shrink-0 underline"
                    >
                      Dar de baja
                    </button>
                  </div>
                )
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    {planExpiresAt
                      ? "Sin cobros automáticos. Renovalo cuando quieras antes del vencimiento."
                      : "Sin cobros automáticos."}
                  </p>
                  <a
                    href="/upgrade"
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    Renovar
                  </a>
                </div>
              )}
            </div>
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

            {/* Canjear cupón */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-2">¿Tenés un cupón?</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setRedeemMsg(null); }}
                  onKeyDown={(e) => e.key === "Enter" && redeemCoupon()}
                  placeholder="CÓDIGO"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={redeemCoupon}
                  disabled={redeeming || !couponCode.trim()}
                  className="px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {redeeming ? "Canjeando..." : "Canjear"}
                </button>
              </div>
              {redeemMsg && (
                <p className={`text-xs mt-2 ${redeemMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                  {redeemMsg.text}
                </p>
              )}
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

      {/* Modo sucursales */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 mb-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-blue-600" />
            <h2 className="font-semibold text-sm text-gray-900">Modo sucursales</h2>
            {!isPro && (
              <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                <Crown className="w-3 h-3" />
                Pro
              </span>
            )}
          </div>
          {isPro && (
            <button
              onClick={() => setBranchConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                branchConfig.enabled ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                branchConfig.enabled ? "translate-x-4" : "translate-x-1"
              }`} />
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Permitir que cada sucursal marque qué transferencias le pertenecen.
        </p>

        {!isPro && (
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl">
            <p className="text-xs text-purple-700">Disponible en el plan Pro</p>
            <a href="/upgrade" className="text-xs font-medium text-purple-700 hover:underline">
              Mejorar plan →
            </a>
          </div>
        )}

        {isPro && branchConfig.enabled && (
          <div className="space-y-4">
            {/* Contraseña */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Contraseña compartida
              </label>
              <input
                type="text"
                value={branchConfig.password}
                onChange={(e) => setBranchConfig(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: local123"
              />
              <p className="text-xs text-gray-400 mt-1">La misma para todas las sucursales</p>
            </div>

            {/* Sucursales */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Sucursales</label>
              <div className="space-y-2">
                {branchConfig.branches.map((b) => (
                  <div key={b.id} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-white shadow"
                      style={{ backgroundColor: b.color }}
                    />
                    <input
                      type="text"
                      value={b.name}
                      onChange={(e) => updateBranchName(b.id, e.target.value)}
                      placeholder="Nombre de la sucursal"
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removeBranch(b.id)}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {branchConfig.branches.length < 8 && (
                <button
                  onClick={addBranch}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar sucursal
                </button>
              )}
            </div>

            <button
              onClick={saveBranchConfig}
              disabled={savingBranch || !branchConfig.password.trim() || branchConfig.branches.some(b => !b.name.trim())}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {savingBranch ? "Guardando..." : savedBranch ? "¡Guardado!" : "Guardar configuración"}
            </button>
          </div>
        )}

        {isPro && !branchConfig.enabled && branchConfig.branches.length > 0 && (
          <button
            onClick={saveBranchConfig}
            disabled={savingBranch}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {savingBranch ? "Guardando..." : "Guardar (desactivado)"}
          </button>
        )}
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

        <div className="mt-6 pt-5 border-t border-gray-100">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar cuenta
          </button>
        </div>
      </section>

      {/* Modal confirmar eliminación de cuenta */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Eliminar cuenta</h3>
                <p className="text-sm text-gray-500">
                  Esta acción es permanente. Se eliminarán tu cuenta, dispositivos y todos los datos asociados. No se puede deshacer.
                </p>
              </div>
            </div>
            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(""); }}
                disabled={deletingAccount}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingAccount ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
