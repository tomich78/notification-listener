"use client";

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Notification, BranchConfig } from "@/lib/types";
import { formatCurrency, formatDateShort, isToday, extractAmount } from "@/lib/utils";
import { TrendingUp, Bell, Smartphone, Globe, Plus, Pencil, Trash2, X, Search, Calendar, AlertTriangle } from "lucide-react";
import OnboardingWizard from "@/components/OnboardingWizard";

function toLocalDateString(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function isSameDay(ts: { toDate?: () => Date } | Date, dateStr: string): boolean {
  const date = ts instanceof Date ? ts : (ts as { toDate: () => Date }).toDate?.() ?? new Date(0);
  return toLocalDateString(date) === dateStr;
}

const SOURCE_LABELS: Record<string, string> = {
  android: "Android",
  mercadopago: "MercadoPago",
  webhook: "Webhook",
  manual: "Manual",
};

const SOURCE_COLORS: Record<string, string> = {
  android: "bg-green-100 text-green-700",
  mercadopago: "bg-blue-100 text-blue-700",
  webhook: "bg-purple-100 text-purple-700",
  manual: "bg-yellow-100 text-yellow-700",
};

interface NotifForm {
  text: string;
  app: string;
  amount: string;
  datetime: string;
}

function nowLocalDatetime() {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
}

const EMPTY_FORM: NotifForm = { text: "", app: "", amount: "", datetime: nowLocalDatetime() };

export default function DashboardPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchConfig, setBranchConfig] = useState<BranchConfig | null>(null);
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");
  const [notifLimit, setNotifLimit] = useState<number>(100);
  const [showWizard, setShowWizard] = useState(false);
  const [filter, setFilter] = useState<"today" | "date" | "all">("today");
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));
  const [search, setSearch] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Notification | null>(null);
  const [form, setForm] = useState<NotifForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token) => {
      fetch("/api/cron/mp-sync", {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      const data = snap.data();
      if (data?.branchConfig?.enabled) setBranchConfig(data.branchConfig as BranchConfig);
      if (data?.plan) setUserPlan(data.plan);
    });
    getDoc(doc(db, "config", "plans")).then((snap) => {
      const limit = snap.data()?.freeNotifLimit;
      if (limit) setNotifLimit(limit);
    });
    // Verificar si debe mostrar el wizard
    const done = localStorage.getItem(`nlistener_onboarding_done_${user.uid}`);
    if (!done) {
      getDocs(query(collection(db, "devices"), where("userId", "==", user.uid), where("active", "==", true), limit(1)))
        .then((snap) => {
          if (snap.size === 0) setShowWizard(true);
        });
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notification[]);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const filtered = useMemo(() => {
    let base = notifications;
    if (filter === "today") base = notifications.filter((n) => n.timestamp && isToday(n.timestamp));
    else if (filter === "date") base = notifications.filter((n) => n.timestamp && isSameDay(n.timestamp, selectedDate));
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter((n) =>
        n.text.toLowerCase().includes(q) ||
        n.app.toLowerCase().includes(q) ||
        (n.deviceName ?? "").toLowerCase().includes(q)
      );
    }
    return base;
  }, [notifications, filter, selectedDate, search]);

  const todayTotal = filtered
    .filter((n) => n.amount !== null)
    .reduce((sum, n) => sum + (n.amount ?? 0), 0);

  const monthNotifCount = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return notifications.filter((n) => {
      const ts = n.timestamp instanceof Date ? n.timestamp : n.timestamp?.toDate?.();
      return ts && ts >= startOfMonth;
    }).length;
  }, [notifications]);

  // — Modal helpers —
  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(n: Notification) {
    setEditing(n);
    const date = n.timestamp instanceof Date ? n.timestamp : n.timestamp?.toDate?.() ?? new Date();
    const datetimeStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16);
    setForm({
      text: n.text,
      app: n.app,
      amount: n.amount !== null ? String(n.amount) : "",
      datetime: datetimeStr,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!user || !form.text.trim()) return;
    setSaving(true);

    const amount = form.amount.trim()
      ? parseFloat(form.amount.replace(",", ".")) || extractAmount(form.amount)
      : null;

    const timestamp = form.datetime ? new Date(form.datetime) : new Date();

    if (editing) {
      await updateDoc(doc(db, "notifications", editing.id), {
        text: form.text.trim(),
        app: form.app.trim() || "Manual",
        amount: isNaN(amount as number) ? null : amount,
        timestamp,
      });
    } else {
      await addDoc(collection(db, "notifications"), {
        userId: user.uid,
        deviceId: null,
        deviceName: null,
        source: "manual",
        text: form.text.trim(),
        app: form.app.trim() || "Manual",
        amount: isNaN(amount as number) ? null : amount,
        timestamp,
      });
    }

    setSaving(false);
    closeModal();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta notificación?")) return;
    setDeleting(id);
    await deleteDoc(doc(db, "notifications", id));
    setDeleting(null);
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Tus cobros en tiempo real</p>
      </div>

      {/* Límite free */}
      {userPlan === "free" && (
        <div className={`mb-6 rounded-xl border px-4 py-3 flex items-center gap-3 ${monthNotifCount >= notifLimit ? "bg-red-50 border-red-200" : monthNotifCount >= notifLimit * 0.8 ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-200"}`}>
          {monthNotifCount >= notifLimit * 0.8 && (
            <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${monthNotifCount >= notifLimit ? "text-red-500" : "text-yellow-500"}`} />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-700">Notificaciones este mes</span>
              <span className={`text-xs font-semibold ${monthNotifCount >= notifLimit ? "text-red-600" : "text-gray-600"}`}>
                {monthNotifCount} / {notifLimit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${monthNotifCount >= notifLimit ? "bg-red-500" : monthNotifCount >= notifLimit * 0.8 ? "bg-yellow-500" : "bg-blue-500"}`}
                style={{ width: `${Math.min(100, (monthNotifCount / notifLimit) * 100)}%` }}
              />
            </div>
          </div>
          {monthNotifCount >= notifLimit * 0.8 && (
            <a href="/upgrade" className="flex-shrink-0 text-xs font-medium text-blue-600 hover:underline">
              Mejorar plan →
            </a>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<TrendingUp className="w-4 h-4 text-green-600" />} label="Total hoy" value={formatCurrency(todayTotal)} color="bg-green-50" />
        <StatCard icon={<Bell className="w-4 h-4 text-blue-600" />} label="Cobros hoy" value={String(filtered.length)} color="bg-blue-50" />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
          label="Total histórico"
          value={formatCurrency(notifications.filter((n) => n.amount !== null).reduce((s, n) => s + (n.amount ?? 0), 0))}
          color="bg-purple-50"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-sm text-gray-900">Notificaciones</h2>
              <button
                onClick={openAdd}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar
              </button>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <FilterBtn active={filter === "today"} onClick={() => setFilter("today")}>Hoy</FilterBtn>
              <FilterBtn active={filter === "date"} onClick={() => setFilter("date")}>Fecha</FilterBtn>
              <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>Todas</FilterBtn>
            </div>
          </div>

          <div className="flex gap-3">
            {filter === "date" && (
              <div className="relative flex-shrink-0">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  max={toLocalDateString(new Date())}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar notificaciones..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Fuente</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">App</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Notificación</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Monto</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Hora</th>
                  {branchConfig && <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Sucursal</th>}
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[n.source] ?? "bg-gray-100 text-gray-600"}`}>
                        {n.source === "android" ? <Smartphone className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                        {SOURCE_LABELS[n.source] ?? n.source}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{n.app}</td>
                    <td className="px-6 py-3 text-gray-700 max-w-xs truncate">{n.text}</td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">
                      {n.amount !== null ? formatCurrency(n.amount) : "—"}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-400">
                      {n.timestamp ? formatDateShort(n.timestamp) : "—"}
                    </td>
                    {branchConfig && (
                      <td className="px-6 py-3">
                        {(() => {
                          const branch = branchConfig.branches.find((b) => b.id === n.branchId);
                          return branch ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: branch.color }}
                            >
                              {branch.name}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          );
                        })()}
                      </td>
                    )}
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(n)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(n.id)}
                          disabled={deleting === n.id}
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

      {/* Onboarding wizard */}
      {showWizard && (
        <OnboardingWizard onDone={() => setShowWizard(false)} />
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-gray-900">
                {editing ? "Editar notificación" : "Agregar notificación"}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Texto</label>
                <textarea
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Ej: Recibiste $1.500 de Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">App / Fuente</label>
                <input
                  type="text"
                  value={form.app}
                  onChange={(e) => setForm({ ...form, app: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: MercadoPago"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha y hora</label>
                <input
                  type="datetime-local"
                  value={form.datetime}
                  onChange={(e) => setForm({ ...form, datetime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Monto (opcional)</label>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm border-r border-gray-200">$</span>
                  <input
                    type="text"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 text-sm focus:outline-none"
                    placeholder="1500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.text.trim()}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Guardando..." : editing ? "Guardar cambios" : "Agregar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
    >
      {children}
    </button>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Bell className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">Sin notificaciones todavía</p>
      <p className="text-xs text-gray-400 mb-4">Conectá un dispositivo Android o agregá una manualmente.</p>
      <button onClick={onAdd} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
        <Plus className="w-4 h-4" />
        Agregar notificación
      </button>
    </div>
  );
}
