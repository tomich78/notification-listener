"use client";

import { use, useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Notification, BranchConfig } from "@/lib/types";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { Bell, Globe, Smartphone, Search, Calendar, Lock, ChevronDown } from "lucide-react";

const SOURCE_COLORS: Record<string, string> = {
  android: "bg-green-100 text-green-700",
  mercadopago: "bg-blue-100 text-blue-700",
  webhook: "bg-purple-100 text-purple-700",
  manual: "bg-yellow-100 text-yellow-700",
};

function toLocalDateString(date: Date): string {
  return date.toLocaleDateString("en-CA");
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

  // Branch state
  const [branchConfig, setBranchConfig] = useState<BranchConfig | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [activeBranch, setActiveBranch] = useState<string | null>(null); // null = no logueado
  const [assigning, setAssigning] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  useEffect(() => {
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists() && snap.data().branchConfig?.enabled) {
        setBranchConfig(snap.data().branchConfig as BranchConfig);
      }
    });
  }, [uid]);

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

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!branchConfig) return;
    if (password === branchConfig.password) {
      setActiveBranch("__selecting__");
      setPasswordError("");
    } else {
      setPasswordError("Contraseña incorrecta");
    }
  }

  function enterReadOnly() {
    setActiveBranch("__readonly__");
  }

  async function assignBranch(notifId: string, branchId: string | null) {
    setAssigning(notifId);
    setDropdownOpen(null);
    await fetch("/api/branch", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: uid, notifId, branchId, password }),
    });
    setAssigning(null);
  }

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

  const total = filtered.reduce((s, n) => s + (n.amount ?? 0), 0);
  const unassigned = filtered.filter((n) => !n.branchId);
  const unassignedTotal = unassigned.reduce((s, n) => s + (n.amount ?? 0), 0);
  const isToday = selectedDate === toLocalDateString(new Date());
  const branchMode = branchConfig?.enabled && activeBranch && activeBranch !== "__selecting__" && activeBranch !== "__readonly__";
  const readOnly = activeBranch === "__readonly__";

  // — Pantalla de contraseña —
  if (branchConfig?.enabled && !activeBranch) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-blue-600" />
            <h1 className="font-bold text-gray-900">Acceso a sucursales</h1>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ingresá la contraseña"
                autoFocus
              />
              {passwordError && <p className="text-xs text-red-600 mt-1">{passwordError}</p>}
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Entrar
            </button>
          </form>
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <button
              onClick={enterReadOnly}
              className="text-sm text-gray-400 hover:text-gray-600 hover:underline"
            >
              Solo ver, sin marcar →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // — Pantalla de selección de sucursal —
  if (branchConfig?.enabled && activeBranch === "__selecting__") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm shadow-sm">
          <h1 className="font-bold text-gray-900 mb-2">¿Qué sucursal sos?</h1>
          <p className="text-sm text-gray-400 mb-6">Elegí para marcar tus transferencias</p>
          <div className="space-y-2">
            {branchConfig.branches.map((b) => (
              <button
                key={b.id}
                onClick={() => setActiveBranch(b.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                <span className="text-sm font-medium text-gray-900">{b.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentBranch = branchConfig?.branches.find(b => b.id === activeBranch);

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
          <div className="flex items-center gap-2">
            {currentBranch && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: currentBranch.color }}>
                <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                {currentBranch.name}
              </div>
            )}
            {(readOnly || !branchMode) && (
              <span className="text-xs text-gray-400">Solo lectura</span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">

        {/* Totales */}
        <div className={`grid gap-3 ${(branchMode || readOnly) ? "grid-cols-2 sm:grid-cols-3" : ""}`}>
          {/* Total global */}
          <div className={`bg-white rounded-2xl border border-gray-200 p-5 text-center ${!(branchMode || readOnly) ? "col-span-full" : ""}`}>
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Total global</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(total)}</p>
            <p className="text-xs text-gray-400 mt-1">{filtered.length} cobros</p>
          </div>

          {/* Sin asignar */}
          {(branchMode || readOnly) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Sin asignar</p>
              <p className="text-2xl font-bold text-gray-500">{formatCurrency(unassignedTotal)}</p>
              <p className="text-xs text-gray-400 mt-1">{unassigned.length} cobros</p>
            </div>
          )}

          {/* Por sucursal */}
          {(branchMode || readOnly) && branchConfig!.branches.map((b) => {
            const bNotifs = filtered.filter(n => n.branchId === b.id);
            const bTotal = bNotifs.reduce((s, n) => s + (n.amount ?? 0), 0);
            return (
              <div key={b.id} className="bg-white rounded-2xl border-2 p-5 text-center" style={{ borderColor: b.color + "40" }}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                  <p className="text-xs font-medium" style={{ color: b.color }}>{b.name}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(bTotal)}</p>
                <p className="text-xs text-gray-400 mt-1">{bNotifs.length} cobros</p>
              </div>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="flex gap-3">
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
              {filtered.map((n) => {
                const assignedBranch = branchConfig?.branches.find(b => b.id === n.branchId);
                const isAssigning = assigning === n.id;
                const isOpen = dropdownOpen === n.id;

                return (
                  <div
                    key={n.id}
                    className="flex items-center justify-between px-5 py-4 transition-colors"
                    style={assignedBranch ? { backgroundColor: assignedBranch.color + "12", borderLeft: `3px solid ${assignedBranch.color}` } : {}}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${SOURCE_COLORS[n.source] ?? "bg-gray-100 text-gray-500"}`}>
                        {n.source === "android" ? <Smartphone className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700 truncate">{n.text}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-400">{n.app}{n.deviceName ? ` · ${n.deviceName}` : ""}</p>
                          {assignedBranch && (
                            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: assignedBranch.color }}>
                              {assignedBranch.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {n.amount !== null ? formatCurrency(n.amount) : "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {n.timestamp ? formatDateShort(n.timestamp) : "—"}
                        </p>
                      </div>

                      {/* Botón asignar sucursal */}
                      {branchMode && (
                        <div className="relative">
                          <button
                            onClick={() => setDropdownOpen(isOpen ? null : n.id)}
                            disabled={isAssigning}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50"
                            style={assignedBranch
                              ? { borderColor: assignedBranch.color, color: assignedBranch.color, backgroundColor: assignedBranch.color + "15" }
                              : { borderColor: "#E5E7EB", color: "#6B7280" }
                            }
                          >
                            {isAssigning ? (
                              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                {assignedBranch
                                  ? <><div className="w-2 h-2 rounded-full" style={{ backgroundColor: assignedBranch.color }} />{assignedBranch.name}</>
                                  : "Asignar"
                                }
                                <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>

                          {isOpen && (
                            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-10 min-w-36 py-1">
                              {branchConfig!.branches.map((b) => (
                                <button
                                  key={b.id}
                                  onClick={() => assignBranch(n.id, b.id)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 text-left"
                                >
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                                  {b.name}
                                </button>
                              ))}
                              {n.branchId && (
                                <>
                                  <div className="border-t border-gray-100 my-1" />
                                  <button
                                    onClick={() => assignBranch(n.id, null)}
                                    className="w-full px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 text-left"
                                  >
                                    Quitar asignación
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cerrar dropdown al hacer click afuera */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setDropdownOpen(null)} />
      )}
    </div>
  );
}
