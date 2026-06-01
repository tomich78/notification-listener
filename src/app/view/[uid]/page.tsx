"use client";

import { use, useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Notification } from "@/lib/types";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { Bell, Globe, Smartphone, Search, Calendar } from "lucide-react";

const SOURCE_COLORS: Record<string, string> = {
  android: "bg-green-100 text-green-700",
  mercadopago: "bg-blue-100 text-blue-700",
  webhook: "bg-purple-100 text-purple-700",
};

function toLocalDateString(date: Date): string {
  return date.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function isSameDay(ts: { toDate?: () => Date } | Date, dateStr: string): boolean {
  const date = ts instanceof Date ? ts : ts.toDate?.() ?? new Date(0);
  return toLocalDateString(date) === dateStr;
}

export default function PublicViewPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notification[]);
      setLoading(false);
    });

    return unsub;
  }, [uid]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (!n.timestamp) return false;
      if (!isSameDay(n.timestamp, selectedDate)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          n.text.toLowerCase().includes(q) ||
          n.app.toLowerCase().includes(q) ||
          (n.deviceName ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [notifications, selectedDate, search]);

  const total = filtered
    .filter((n) => n.amount !== null)
    .reduce((s, n) => s + (n.amount ?? 0), 0);

  const isToday = selectedDate === toLocalDateString(new Date());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm text-gray-900">
              {isToday ? "Cobros de hoy" : "Cobros"}
            </span>
          </div>
          <span className="text-xs text-gray-400">Solo lectura</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">

        {/* Total */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">
            Total {isToday ? "recibido hoy" : selectedDate}
          </p>
          <p className="text-4xl font-bold text-gray-900">{formatCurrency(total)}</p>
          <p className="text-sm text-gray-400 mt-2">{filtered.length} cobros</p>
        </div>

        {/* Filtros */}
        <div className="flex gap-3">
          {/* Fecha */}
          <div className="relative flex-shrink-0">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={selectedDate}
              max={toLocalDateString(new Date())}
              onChange={(e) => { setSelectedDate(e.target.value); setSearch(""); }}
              className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar en cobros del día..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-2xl border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Bell className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                {search ? "Sin resultados para esa búsqueda" : "Sin cobros para este día"}
              </p>
              {search && (
                <button onClick={() => setSearch("")} className="text-xs text-blue-600 mt-2 hover:underline">
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((n) => (
                <div key={n.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                      SOURCE_COLORS[n.source] ?? "bg-gray-100 text-gray-500"
                    }`}>
                      {n.source === "android" ? (
                        <Smartphone className="w-3.5 h-3.5" />
                      ) : (
                        <Globe className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 truncate">{n.text}</p>
                      <p className="text-xs text-gray-400">
                        {n.app}{n.deviceName ? ` · ${n.deviceName}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right ml-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {n.amount !== null ? formatCurrency(n.amount) : "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {n.timestamp ? formatDateShort(n.timestamp) : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
