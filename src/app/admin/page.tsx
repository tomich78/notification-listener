"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { User, Device } from "@/lib/types";
import { Users, Smartphone, BarChart2, Tag, LogOut } from "lucide-react";

const ADMIN_EMAIL = "tdsdeveloper00@gmail.com";

type Tab = "stats" | "users" | "devices" | "plans";

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
      {/* Header */}
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

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {(
            [
              { id: "stats", label: "Stats", icon: BarChart2 },
              { id: "users", label: "Usuarios", icon: Users },
              { id: "devices", label: "Dispositivos", icon: Smartphone },
              { id: "plans", label: "Planes", icon: Tag },
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

      {/* Content */}
      <div className="p-6 max-w-5xl mx-auto">
        {tab === "stats" && <StatsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "devices" && <DevicesTab />}
        {tab === "plans" && <PlansTab />}
      </div>
    </div>
  );
}

/* ─── Stats ─────────────────────────────────────────────────── */
function StatsTab() {
  const [stats, setStats] = useState({ users: 0, devices: 0, notifications: 0, proUsers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [usersSnap, devicesSnap, notifsSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "devices")),
        getDocs(collection(db, "notifications")),
      ]);
      const proUsers = usersSnap.docs.filter((d) => d.data().plan === "pro").length;
      setStats({
        users: usersSnap.size,
        devices: devicesSnap.size,
        notifications: notifsSnap.size,
        proUsers,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <StatCard label="Usuarios totales" value={stats.users} color="bg-blue-50 text-blue-600" />
      <StatCard label="Usuarios Pro" value={stats.proUsers} color="bg-purple-50 text-purple-600" />
      <StatCard label="Dispositivos" value={stats.devices} color="bg-green-50 text-green-600" />
      <StatCard label="Notificaciones" value={stats.notifications} color="bg-orange-50 text-orange-600" />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color.split(" ")[1]}`}>{value}</p>
    </div>
  );
}

/* ─── Users ──────────────────────────────────────────────────── */
function UsersTab() {
  const [users, setUsers] = useState<(User & { uid: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"))).then((snap) => {
      setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as User & { uid: string })));
      setLoading(false);
    });
  }, []);

  async function togglePlan(uid: string, current: "free" | "pro") {
    setSaving(uid);
    const newPlan = current === "free" ? "pro" : "free";
    await updateDoc(doc(db, "users", uid), { plan: newPlan });
    setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, plan: newPlan } : u)));
    setSaving(null);
  }

  if (loading) return <Spinner />;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <Th>Nombre</Th>
            <Th>Email</Th>
            <Th>Plan</Th>
            <Th>Creado</Th>
            <Th>Acción</Th>
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
                {u.createdAt?.toDate?.()?.toLocaleDateString("es-AR") ?? "—"}
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
function DevicesTab() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "devices"), orderBy("createdAt", "desc"))).then((snap) => {
      setDevices(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Device)));
      setLoading(false);
    });
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <Th>Nombre</Th>
            <Th>Token</Th>
            <Th>Estado</Th>
            <Th>Último heartbeat</Th>
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
                {d.lastSeen?.toDate?.()?.toLocaleString("es-AR") ?? "Nunca"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Plans ──────────────────────────────────────────────────── */
function PlansTab() {
  const [config, setConfig] = useState<PlanConfig>(DEFAULT_PLAN_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "config", "plans")).then((snap) => {
      if (snap.exists()) setConfig(snap.data() as PlanConfig);
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true);
    await setDoc(doc(db, "config", "plans"), config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <Spinner />;

  return (
    <div className="max-w-md">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-semibold text-gray-900">Configuración de planes</h2>

        <Field
          label="Dispositivos máx. (Free)"
          value={config.freeDeviceLimit}
          onChange={(v) => setConfig({ ...config, freeDeviceLimit: v })}
        />
        <Field
          label="Dispositivos máx. (Pro)"
          value={config.proDeviceLimit}
          onChange={(v) => setConfig({ ...config, proDeviceLimit: v })}
        />
        <Field
          label="Notificaciones/mes (Free)"
          value={config.freeNotifLimit}
          onChange={(v) => setConfig({ ...config, freeNotifLimit: v })}
        />
        <Field
          label="Precio Pro (ARS/mes)"
          value={config.proPrice}
          onChange={(v) => setConfig({ ...config, proPrice: v })}
          prefix="$"
        />

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

function Field({
  label,
  value,
  onChange,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
        {prefix && (
          <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm border-r border-gray-200">
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-3 py-2 text-sm focus:outline-none"
        />
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */
function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
      {children}
    </th>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
