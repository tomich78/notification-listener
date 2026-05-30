"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Notification } from "@/lib/types";
import { formatCurrency, formatDateShort, isToday } from "@/lib/utils";
import { TrendingUp, Bell, Smartphone, Globe } from "lucide-react";

const SOURCE_LABELS: Record<string, string> = {
  android: "Android",
  mercadopago: "MercadoPago",
  webhook: "Webhook",
};

const SOURCE_COLORS: Record<string, string> = {
  android: "bg-green-100 text-green-700",
  mercadopago: "bg-blue-100 text-blue-700",
  webhook: "bg-purple-100 text-purple-700",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"today" | "all">("today");

  // Sincronizar pagos de MercadoPago al abrir el dashboard
  useEffect(() => {
    if (!user) return;
    user.getIdToken().then((token) => {
      fetch("/api/cron/mp-sync", {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {}); // silencioso — no bloquea el dashboard
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Notification[];
      setNotifications(data);
      setLoading(false);
    });

    return unsub;
  }, [user]);

  const filtered =
    filter === "today"
      ? notifications.filter((n) => n.timestamp && isToday(n.timestamp))
      : notifications;

  const todayTotal = filtered
    .filter((n) => n.amount !== null)
    .reduce((sum, n) => sum + (n.amount ?? 0), 0);

  const todayCount = filtered.length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Tus cobros en tiempo real</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-green-600" />}
          label="Total hoy"
          value={formatCurrency(todayTotal)}
          color="bg-green-50"
        />
        <StatCard
          icon={<Bell className="w-4 h-4 text-blue-600" />}
          label="Cobros hoy"
          value={String(todayCount)}
          color="bg-blue-50"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
          label="Total histórico"
          value={formatCurrency(
            notifications
              .filter((n) => n.amount !== null)
              .reduce((s, n) => s + (n.amount ?? 0), 0)
          )}
          color="bg-purple-50"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-sm text-gray-900">Notificaciones</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <FilterBtn active={filter === "today"} onClick={() => setFilter("today")}>
              Hoy
            </FilterBtn>
            <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>
              Todas
            </FilterBtn>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Fuente
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    App
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Notificación
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Monto
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Hora
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          SOURCE_COLORS[n.source] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {n.source === "android" ? (
                          <Smartphone className="w-3 h-3" />
                        ) : (
                          <Globe className="w-3 h-3" />
                        )}
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
        active
          ? "bg-white text-gray-900 shadow-sm"
          : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Bell className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">Sin notificaciones todavía</p>
      <p className="text-xs text-gray-400">
        Conectá un dispositivo Android o una integración para empezar.
      </p>
    </div>
  );
}
