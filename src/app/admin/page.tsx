"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Users, Smartphone, BarChart2, Tag, LogOut, ExternalLink, Ticket, Trash2, Copy, Check } from "lucide-react";

const ADMIN_EMAIL = "tdsdeveloper00@gmail.com";

type Tab = "stats" | "users" | "devices" | "plans" | "coupons";

interface PlanConfig {
  freeDeviceLimit: number;
  proDeviceLimit: number;
  freeNotifLimit: number;
  proPrice: number;
}

const DEFAULT_PLAN_CONFIG: PlanConfig = {
  freeDeviceLimit: 1,
  proDeviceLimit: 5,
  freeNotifLimit: 100,
  proPrice: 2500,
};

async function adminFetch(url: string, token: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export default function AdminPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("stats");

  useEffect(() => {
    if (!loading && (!user || user.email !== ADMIN_EMAIL)) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || !user || user.email !== ADMIN_EMAIL) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Panel de Admin</h1>
          <p className="text-xs text-gray-400">NListener</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          <LogOut className="w-4 h-4" />
          Salir
        </button>
      </div>

      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {(
            [
              { id: "stats", label: "Stats", icon: BarChart2 },
              { id: "users", label: "Usuarios", icon: Users },
              { id: "devices", label: "Dispositivos", icon: Smartphone },
              { id: "plans", label: "Planes", icon: Tag },
              { id: "coupons", label: "Cupones", icon: Ticket },
            ] as { id: Tab; label: string; icon: React.ElementType }[]
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-5xl mx-auto">
        {tab === "stats"   && <StatsTab   user={user} />}
        {tab === "users"   && <UsersTab   user={user} />}
        {tab === "devices" && <DevicesTab user={user} />}
        {tab === "plans"   && <PlansTab   user={user} />}
        {tab === "coupons" && <CouponsTab user={user} />}
      </div>
    </div>
  );
}

/* ─── Stats ──────────────────────────────────────────────────── */
function StatsTab({ user }: { user: { getIdToken: () => Promise<string> } }) {
  const [stats, setStats] = useState<{ users: number; proUsers: number; devices: number; notifications: number } | null>(null);

  useEffect(() => {
    user.getIdToken().then((token) =>
      adminFetch("/api/admin/stats", token).then(setStats)
    );
  }, [user]);

  if (!stats) return <Spinner />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard label="Usuarios totales" value={stats.users}        color="text-blue-600" />
      <StatCard label="Usuarios Pro"     value={stats.proUsers}     color="text-purple-600" />
      <StatCard label="Dispositivos"     value={stats.devices}      color="text-green-600" />
      <StatCard label="Notificaciones"   value={stats.notifications} color="text-orange-600" />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

/* ─── Users ──────────────────────────────────────────────────── */
interface UserRow { uid: string; displayName: string; email: string; plan: "free" | "pro"; createdAt: string | null }

function UsersTab({ user }: { user: { getIdToken: () => Promise<string> } }) {
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(() => {
    user.getIdToken().then((token) =>
      adminFetch("/api/admin/users", token).then(setUsers)
    );
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function togglePlan(uid: string, current: "free" | "pro") {
    setSaving(uid);
    const newPlan = current === "free" ? "pro" : "free";
    const token = await user.getIdToken();
    await adminFetch("/api/admin/users", token, {
      method: "PATCH",
      body: JSON.stringify({ uid, plan: newPlan }),
    });
    setUsers((prev) => prev?.map((u) => u.uid === uid ? { ...u, plan: newPlan } : u) ?? null);
    setSaving(null);
  }

  if (!users) return <Spinner />;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <Th>Nombre</Th><Th>Email</Th><Th>Plan</Th><Th>Creado</Th><Th>Vista pública</Th><Th>Acción</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {users.map((u) => (
            <tr key={u.uid} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{u.displayName || "—"}</td>
              <td className="px-4 py-3 text-gray-500">{u.email}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  u.plan === "pro" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
                }`}>
                  {u.plan === "pro" ? "Pro" : "Free"}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {u.createdAt ? new Date(u.createdAt).toLocaleDateString("es-AR") : "—"}
              </td>
              <td className="px-4 py-3">
                <a
                  href={`/view/${u.uid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver
                </a>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => togglePlan(u.uid, u.plan)}
                  disabled={saving === u.uid}
                  className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  {saving === u.uid ? "..." : u.plan === "pro" ? "Bajar a Free" : "Subir a Pro"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Devices ────────────────────────────────────────────────── */
interface DeviceRow { id: string; name: string; token: string; active: boolean; lastSeen: string | null }

function DevicesTab({ user }: { user: { getIdToken: () => Promise<string> } }) {
  const [devices, setDevices] = useState<DeviceRow[] | null>(null);

  useEffect(() => {
    user.getIdToken().then((token) =>
      adminFetch("/api/admin/devices", token).then(setDevices)
    );
  }, [user]);

  if (!devices) return <Spinner />;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <Th>Nombre</Th><Th>Token</Th><Th>Estado</Th><Th>Último heartbeat</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {devices.map((d) => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{d.name || "—"}</td>
              <td className="px-4 py-3 text-gray-400 font-mono text-xs">{d.token.slice(0, 12)}…</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  d.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {d.active ? "Activo" : "Inactivo"}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">
                {d.lastSeen ? new Date(d.lastSeen).toLocaleString("es-AR") : "Nunca"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Plans ──────────────────────────────────────────────────── */
function PlansTab({ user }: { user: { getIdToken: () => Promise<string> } }) {
  const [config, setConfig] = useState<PlanConfig>(DEFAULT_PLAN_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    user.getIdToken().then((token) =>
      adminFetch("/api/admin/plans", token).then((data) => {
        setConfig(data as PlanConfig);
        setLoading(false);
      })
    );
  }, [user]);

  async function save() {
    setSaving(true);
    const token = await user.getIdToken();
    await adminFetch("/api/admin/plans", token, { method: "PUT", body: JSON.stringify(config) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <Spinner />;

  return (
    <div className="max-w-md">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Configuración de planes</h2>
        <Field label="Dispositivos máx. (Free)" value={config.freeDeviceLimit} onChange={(v) => setConfig({ ...config, freeDeviceLimit: v })} />
        <Field label="Dispositivos máx. (Pro)"  value={config.proDeviceLimit}  onChange={(v) => setConfig({ ...config, proDeviceLimit: v })} />
        <Field label="Notificaciones/mes (Free)" value={config.freeNotifLimit} onChange={(v) => setConfig({ ...config, freeNotifLimit: v })} />
        <Field label="Precio Pro (ARS/mes)" value={config.proPrice} onChange={(v) => setConfig({ ...config, proPrice: v })} prefix="$" />
        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Guardando..." : saved ? "¡Guardado!" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

/* ─── Cupones ────────────────────────────────────────────────── */
interface CouponRow {
  code: string;
  durationDays: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  createdAt: string | null;
}

function CouponsTab({ user }: { user: { getIdToken: () => Promise<string> } }) {
  const [coupons, setCoupons] = useState<CouponRow[] | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form de creación
  const [newCode, setNewCode] = useState("");
  const [newDuration, setNewDuration] = useState(30);
  const [newMaxUses, setNewMaxUses] = useState<string>(""); // "" = ilimitado
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const load = useCallback(() => {
    user.getIdToken().then((token) =>
      adminFetch("/api/admin/coupons", token).then(setCoupons)
    );
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function createCoupon() {
    setCreating(true);
    setCreateError("");
    try {
      const token = await user.getIdToken();
      await adminFetch("/api/admin/coupons", token, {
        method: "POST",
        body: JSON.stringify({
          code: newCode,
          durationDays: newDuration,
          maxUses: newMaxUses.trim() ? Number(newMaxUses) : null,
        }),
      });
      setNewCode("");
      setNewDuration(30);
      setNewMaxUses("");
      load();
    } catch {
      setCreateError("Error al crear el cupón. Revisá el código (puede que ya exista).");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(code: string, active: boolean) {
    setSaving(code);
    const token = await user.getIdToken();
    await adminFetch("/api/admin/coupons", token, {
      method: "PATCH",
      body: JSON.stringify({ code, active: !active }),
    });
    setCoupons((prev) => prev?.map((c) => c.code === code ? { ...c, active: !active } : c) ?? null);
    setSaving(null);
  }

  async function deleteCoupon(code: string) {
    if (!confirm(`¿Eliminar el cupón "${code}"? Esta acción no se puede deshacer.`)) return;
    setSaving(code);
    const token = await user.getIdToken();
    await adminFetch(`/api/admin/coupons?code=${encodeURIComponent(code)}`, token, { method: "DELETE" });
    setCoupons((prev) => prev?.filter((c) => c.code !== code) ?? null);
    setSaving(null);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  }

  return (
    <div className="space-y-5">
      {/* Crear cupón */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 max-w-lg">
        <h2 className="font-semibold text-gray-900 mb-4">Crear cupón</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Código</label>
            <input
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              placeholder="Ej: VERANO2026"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duración (días)" value={newDuration} onChange={setNewDuration} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Usos máx. (vacío = ilimitado)</label>
              <input
                type="number"
                value={newMaxUses}
                onChange={(e) => setNewMaxUses(e.target.value)}
                placeholder="Ilimitado"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {createError && <p className="text-xs text-red-600">{createError}</p>}
          <button
            onClick={createCoupon}
            disabled={creating || !newCode.trim()}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? "Creando..." : "Crear cupón"}
          </button>
        </div>
      </div>

      {/* Lista de cupones */}
      {!coupons ? <Spinner /> : coupons.length === 0 ? (
        <p className="text-sm text-gray-400">Todavía no creaste ningún cupón.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <Th>Código</Th><Th>Duración</Th><Th>Usos</Th><Th>Estado</Th><Th>Creado</Th><Th>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.map((c) => (
                <tr key={c.code} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-gray-900">
                    <button onClick={() => copyCode(c.code)} className="inline-flex items-center gap-1.5 hover:text-blue-600">
                      {c.code}
                      {copiedCode === c.code ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-gray-300" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.durationDays} días</td>
                  <td className="px-4 py-3 text-gray-500">{c.usedCount} / {c.maxUses ?? "∞"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {c.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString("es-AR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleActive(c.code, c.active)}
                        disabled={saving === c.code}
                        className="text-xs px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {c.active ? "Desactivar" : "Activar"}
                      </button>
                      <button
                        onClick={() => deleteCoupon(c.code)}
                        disabled={saving === c.code}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, prefix }: { label: string; value: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
        {prefix && <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm border-r border-gray-200">{prefix}</span>}
        <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full px-3 py-2 text-sm focus:outline-none" />
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">{children}</th>;
}

function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
