"use client";

import { use, useEffect, useState, useMemo } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Notification, BranchConfig } from "@/lib/types";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { branchLabelLower, branchLabelPluralLower } from "@/lib/branchLabel";
import { Bell, Globe, Smartphone, Search, Calendar, Lock, ChevronDown, RefreshCw, FileDown, Clock, Eye, EyeOff, X } from "lucide-react";
import Image from "next/image";
import ReportModal from "@/components/ReportModal";

const SOURCE_COLORS: Record<string, string> = {
  android: "bg-green-100 text-green-700",
  mercadopago: "bg-blue-100 text-blue-700",
  webhook: "bg-purple-100 text-purple-700",
  manual: "bg-yellow-100 text-yellow-700",
};

function toLocalDateString(date: Date): string {
  return date.toLocaleDateString("en-CA");
}


export default function PublicViewPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);
  const [rangeNotifs, setRangeNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);
  const [dateFrom, setDateFrom] = useState(toLocalDateString(new Date()));
  const [dateTo, setDateTo] = useState(toLocalDateString(new Date()));
  const [hourFrom, setHourFrom] = useState("");
  const [hourTo, setHourTo] = useState("");
  const [search, setSearch] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Tope de cobros que traemos para un rango. Un día normal está muy por debajo;
  // si se supera avisamos para que el usuario acote el rango.
  const RANGE_CAP = 500;

  const [ownerIsPro, setOwnerIsPro] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Branch state
  const [branchConfig, setBranchConfig] = useState<BranchConfig | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [activeBranch, setActiveBranch] = useState<string | null>(null); // null = no logueado
  // "all" = contraseña compartida (puede marcar cualquiera)
  // "group" = contraseña propia (solo puede marcar lo suyo)
  const [authScope, setAuthScope] = useState<"all" | "group">("all");
  const [checkingPassword, setCheckingPassword] = useState(false);
  const [assignError, setAssignError] = useState("");

  const groupLabelLower = branchLabelLower(branchConfig?.label);
  const groupLabelPluralLower = branchLabelPluralLower(branchConfig?.label);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  useEffect(() => {
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.branchConfig?.enabled) {
        setBranchConfig(data.branchConfig as BranchConfig);
      }
      const expiresAt = data.planExpiresAt?.toDate?.();
      const isPro = data.plan === "pro" && (!expiresAt || expiresAt > new Date());
      setOwnerIsPro(isPro);
    });
  }, [uid]);

  // Carga en vivo de todos los cobros del rango de fechas elegido. Los totales por
  // grupo, sin asignar y global se calculan del lado del cliente sobre estos datos,
  // así siempre coinciden con lo que se muestra y respetan el filtro por hora
  // (que no se puede expresar como un rango de Firestore).
  useEffect(() => {
    setLoading(true);

    const start = Timestamp.fromDate(new Date(dateFrom + "T00:00:00"));
    const end = Timestamp.fromDate(new Date(dateTo + "T23:59:59.999"));

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", uid),
      where("timestamp", ">=", start),
      where("timestamp", "<=", end),
      orderBy("timestamp", "desc"),
      limit(RANGE_CAP)
    );
    const unsub = onSnapshot(q, (snap) => {
      setRangeNotifs(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notification[]);
      setTruncated(snap.docs.length === RANGE_CAP);
      setLoading(false);
      setLastUpdated(new Date());
    });
    return unsub;
  }, [uid, dateFrom, dateTo]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated) setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  function handleManualRefresh() {
    // onSnapshot ya mantiene todo en vivo; el botón solo da feedback visual.
    if (refreshing) return;
    setRefreshing(true);
    setLastUpdated(new Date());
    setTimeout(() => setRefreshing(false), 400);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!branchConfig || checkingPassword) return;
    setCheckingPassword(true);
    setPasswordError("");
    try {
      // La contraseña se valida en el servidor: el navegador nunca la recibe.
      const res = await fetch("/api/branch/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError("Contraseña incorrecta");
        return;
      }
      if (data.scope === "group") {
        // Contraseña propia: entra directo a su grupo y solo marca lo suyo
        setAuthScope("group");
        setActiveBranch(data.branchId);
      } else {
        setAuthScope("all");
        setActiveBranch("__selecting__");
      }
    } catch {
      setPasswordError("Error de conexión. Intentá de nuevo.");
    } finally {
      setCheckingPassword(false);
    }
  }

  function enterReadOnly() {
    setActiveBranch("__readonly__");
  }

  async function assignBranch(notifId: string, branchId: string | null) {
    setAssigning(notifId);
    setDropdownOpen(null);
    setAssignError("");
    try {
      const res = await fetch("/api/branch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, notifId, branchId, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAssignError(data.error ?? "No se pudo asignar el cobro.");
        setTimeout(() => setAssignError(""), 4000);
      }
    } catch {
      setAssignError("Error de conexión.");
      setTimeout(() => setAssignError(""), 4000);
    } finally {
      setAssigning(null);
    }
  }

  const uniqueDevices = useMemo(() => {
    const names = new Set<string>();
    for (const n of rangeNotifs) {
      if (n.deviceName) names.add(n.deviceName);
    }
    return Array.from(names).sort();
  }, [rangeNotifs]);

  const hourOf = (n: Notification): number | null => {
    const d = n.timestamp instanceof Date ? n.timestamp : n.timestamp?.toDate?.();
    return d ? d.getHours() : null;
  };

  const filtered = useMemo(() => {
    let base = rangeNotifs;
    // Filtro por hora del día (para turnos). Rango inclusivo hora-a-hora:
    // "de 14 a 22" incluye todo lo ocurrido entre las 14:00 y las 22:59.
    const hf = hourFrom === "" ? null : parseInt(hourFrom, 10);
    const ht = hourTo === "" ? null : parseInt(hourTo, 10);
    if (hf !== null || ht !== null) {
      base = base.filter((n) => {
        const h = hourOf(n);
        if (h === null) return false;
        if (hf !== null && h < hf) return false;
        if (ht !== null && h > ht) return false;
        return true;
      });
    }
    if (deviceFilter) base = base.filter((n) => n.deviceName === deviceFilter);
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter((n) =>
      n.text.toLowerCase().includes(q) ||
      n.app.toLowerCase().includes(q) ||
      (n.deviceName ?? "").toLowerCase().includes(q)
    );
  }, [rangeNotifs, search, deviceFilter, hourFrom, hourTo]);

  // Totales calculados sobre lo filtrado — siempre consistentes con la lista.
  const sumAmount = (list: Notification[]) => list.reduce((acc, n) => acc + (n.amount ?? 0), 0);
  const globalTotal = sumAmount(filtered);
  const globalCount = filtered.length;

  // { branchId | "__none__": { total, count } }
  const branchStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number }> = {};
    for (const n of filtered) {
      const key = n.branchId ?? "__none__";
      if (!stats[key]) stats[key] = { total: 0, count: 0 };
      stats[key].total += n.amount ?? 0;
      stats[key].count += 1;
    }
    return stats;
  }, [filtered]);

  const unassigned = useMemo(() => filtered.filter((n) => !n.branchId), [filtered]);

  // Con contraseña propia solo puede marcarse cobros a sí mismo; con la
  // compartida puede repartirlos entre todos.
  const assignableBranches =
    authScope === "group"
      ? (branchConfig?.branches ?? []).filter((b) => b.id === activeBranch)
      : (branchConfig?.branches ?? []);

  const isToday = dateFrom === dateTo && dateTo === toLocalDateString(new Date());
  const hourFilterActive = hourFrom !== "" || hourTo !== "";
  const branchMode = branchConfig?.enabled && activeBranch && activeBranch !== "__selecting__" && activeBranch !== "__readonly__";
  const readOnly = activeBranch === "__readonly__";

  // — Pantalla de contraseña —
  if (branchConfig?.enabled && !activeBranch) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-blue-600" />
            <h1 className="font-bold text-gray-900">Acceso a {groupLabelPluralLower}</h1>
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
              disabled={checkingPassword}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {checkingPassword ? "Verificando..." : "Entrar"}
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

  // — Pantalla de selección de grupo —
  if (branchConfig?.enabled && activeBranch === "__selecting__") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-sm shadow-sm">
          <h1 className="font-bold text-gray-900 mb-2">¿Qué {groupLabelLower} sos?</h1>
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
            <Image src="/logo.webp" alt="NListener" width={48} height={48} className="rounded-lg" />
            <span className="font-semibold text-sm text-gray-900">
              {isToday ? "Cobros de hoy" : "Cobros"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {branchConfig?.enabled && ownerIsPro && (
              <button
                onClick={() => setShowReport(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" />
                PDF
              </button>
            )}
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">

        {/* Indicador en vivo */}
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-2.5 h-2.5">
              <span className="absolute w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-green-500" />
            </div>
            <span className="text-sm font-medium text-green-800">Actualizado en vivo</span>
            {!refreshing && secondsAgo > 0 && (
              <span className="text-xs text-green-600">· hace {secondsAgo < 60 ? `${secondsAgo}s` : `${Math.floor(secondsAgo / 60)}m`}</span>
            )}
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-300 rounded-lg text-xs font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Actualizando..." : "Actualizar ahora"}
          </button>
        </div>

        {/* Botón mostrar/ocultar totales de los demás */}
        {(branchMode || readOnly) && (
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              {collapsed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {collapsed ? `Ver todos los ${groupLabelPluralLower}` : `Ocultar los demás ${groupLabelPluralLower}`}
            </button>
          </div>
        )}

        {/* Totales */}
        <div className={`grid gap-3 ${(branchMode || readOnly) ? "grid-cols-2 sm:grid-cols-3" : ""}`}>
          {/* Total global */}
          <div className={`bg-white rounded-2xl border border-gray-200 p-5 text-center ${!(branchMode || readOnly) ? "col-span-full" : ""}`}>
            <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Total global</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(globalTotal)}</p>
            <p className="text-xs text-gray-400 mt-1">{globalCount} cobros</p>
          </div>

          {/* Sin asignar */}
          {(branchMode || readOnly) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
              <p className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Sin asignar</p>
              <p className="text-2xl font-bold text-gray-500">{formatCurrency(branchStats["__none__"]?.total ?? 0)}</p>
              <p className="text-xs text-gray-400 mt-1">{branchStats["__none__"]?.count ?? 0} cobros</p>
            </div>
          )}

          {/* Por grupo. Colapsado: solo el grupo propio (o ninguno en modo lectura). */}
          {(branchMode || readOnly) && branchConfig!.branches
            .filter((b) => !collapsed || b.id === activeBranch)
            .map((b) => {
              const st = branchStats[b.id] ?? { total: 0, count: 0 };
              return (
                <div key={b.id} className="bg-white rounded-2xl border-2 p-5 text-center" style={{ borderColor: b.color + "40" }}>
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                    <p className="text-xs font-medium" style={{ color: b.color }}>{b.name}</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(st.total)}</p>
                  <p className="text-xs text-gray-400 mt-1">{st.count} cobros</p>
                </div>
              );
            })}
        </div>

        {truncated && (
          <p className="text-xs text-amber-600 mt-2 text-center">
            Mostrando los {RANGE_CAP} cobros más recientes del rango. Acotá las fechas para ver totales exactos.
          </p>
        )}

        {assignError && (
          <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{assignError}</p>
          </div>
        )}

        {/* Filtros */}
        <div className="space-y-2">
          {/* Fila 1: rango de fechas */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-shrink-0">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <span className="text-xs text-gray-400">hasta</span>
            <div className="relative flex-shrink-0">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                min={dateFrom}
                max={toLocalDateString(new Date())}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {(dateFrom !== toLocalDateString(new Date()) || dateTo !== toLocalDateString(new Date())) && (
              <button
                onClick={() => { const t = toLocalDateString(new Date()); setDateFrom(t); setDateTo(t); }}
                className="text-xs text-blue-600 hover:underline"
              >
                Hoy
              </button>
            )}
          </div>

          {/* Fila 2: horario + dispositivo + búsqueda */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              <select
                value={hourFrom}
                onChange={(e) => setHourFrom(e.target.value)}
                className="text-sm text-gray-700 bg-transparent focus:outline-none"
              >
                <option value="">Desde</option>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                ))}
              </select>
              <span className="text-xs text-gray-300">–</span>
              <select
                value={hourTo}
                onChange={(e) => setHourTo(e.target.value)}
                className="text-sm text-gray-700 bg-transparent focus:outline-none"
              >
                <option value="">Hasta</option>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}:59</option>
                ))}
              </select>
              {hourFilterActive && (
                <button onClick={() => { setHourFrom(""); setHourTo(""); }} className="text-gray-300 hover:text-gray-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {uniqueDevices.length > 1 && (
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los dispositivos</option>
                {uniqueDevices.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar cobros..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
                    className="px-4 py-4 transition-colors"
                    style={assignedBranch ? { backgroundColor: assignedBranch.color + "12", borderLeft: `3px solid ${assignedBranch.color}` } : {}}
                  >
                    {/* Fila superior: ícono + texto + monto */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${SOURCE_COLORS[n.source] ?? "bg-gray-100 text-gray-500"}`}>
                          {n.source === "android" ? <Smartphone className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          {/* Texto completo, sin truncar */}
                          <p className="text-sm text-gray-700 break-words leading-snug">{n.text}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {n.app}{n.deviceName ? ` · ${n.deviceName}` : ""}
                          </p>
                        </div>
                      </div>

                      {/* Monto + hora alineados a la derecha */}
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                          {n.amount !== null ? formatCurrency(n.amount) : "—"}
                        </p>
                        <p className="text-xs text-gray-400 whitespace-nowrap">
                          {n.timestamp ? formatDateShort(n.timestamp) : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Fila inferior: sucursal asignada + botón asignar */}
                    {(assignedBranch || branchMode) && (
                      <div className="flex items-center justify-between mt-2 pl-10">
                        {assignedBranch ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: assignedBranch.color }}>
                            {assignedBranch.name}
                          </span>
                        ) : <span />}

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
                                {assignableBranches.map((b) => (
                                  <button
                                    key={b.id}
                                    onClick={() => assignBranch(n.id, b.id)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 text-left"
                                  >
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }} />
                                    {b.name}
                                  </button>
                                ))}
                                {n.branchId && (authScope === "all" || n.branchId === activeBranch) && (
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
                    )}
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

      {/* Modal reporte PDF */}
      {showReport && (
        <ReportModal userId={uid} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
