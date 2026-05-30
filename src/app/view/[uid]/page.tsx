"use client";

import { use, useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Notification } from "@/lib/types";
import { formatCurrency, formatDateShort, isToday } from "@/lib/utils";
import { Bell, Globe, Smartphone } from "lucide-react";

const SOURCE_COLORS: Record<string, string> = {
  android: "bg-green-100 text-green-700",
  mercadopago: "bg-blue-100 text-blue-700",
  webhook: "bg-purple-100 text-purple-700",
};

export default function PublicViewPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notification[];
      setNotifications(data.filter((n) => n.timestamp && isToday(n.timestamp)));
      setLoading(false);
    });

    return unsub;
  }, [uid]);

  const total = notifications
    .filter((n) => n.amount !== null)
    .reduce((s, n) => s + (n.amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm text-gray-900">Cobros de hoy</span>
          </div>
          <span className="text-xs text-gray-400">Solo lectura</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Total */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 text-center">
          <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">Total recibido hoy</p>
          <p className="text-4xl font-bold text-gray-900">{formatCurrency(total)}</p>
          <p className="text-sm text-gray-400 mt-2">{notifications.length} cobros</p>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-2xl border border-gray-200">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Bell className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Sin cobros por hoy todavía</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((n) => (
                <div key={n.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                        SOURCE_COLORS[n.source] ?? "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {n.source === "android" ? (
                        <Smartphone className="w-3.5 h-3.5" />
                      ) : (
                        <Globe className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 truncate">{n.text}</p>
                      <p className="text-xs text-gray-400">{n.app}</p>
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
