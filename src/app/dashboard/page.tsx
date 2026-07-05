"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
  startAfter,
  writeBatch,
  getAggregateFromServer,
  sum,
  count,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { Notification, BranchConfig } from "@/lib/types";
import { formatCurrency, formatDateShort, isToday, extractAmount, checkPlanExpiry } from "@/lib/utils";
import { TrendingUp, Bell, Smartphone, Globe, Plus, Pencil, Trash2, X, Search, Calendar, AlertTriangle, FileDown, RefreshCw } from "lucide-react";
import OnboardingWizard from "@/components/OnboardingWizard";
import ReportModal from "@/components/ReportModal";

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
  return now.toISOString().slice(0, 16);
}

const EMPTY_FORM: NotifForm = { text: "", app: "", amount: "", datetime: nowLocalDatetime() };
const PAGE_SIZE = 50;

export default function DashboardPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [olderNotifs, setOlderNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const lastVisibleRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastOlderRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const latestIdRef = useRef<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [historicTotal, setHistoricTotal] = useState(0);
  const [historicCount, setHistoricCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);
  const [branchConfig, setBranchConfig] = useState<BranchConfig | null>(null);
  const [userPlan, setUserPlan] = useState<"free" | "pro">("free");
  const [notifLimit, setNotifLimit] = useState<number>(100);
  const [showWizard, setShowWizard] = useState(false);
  const [filter, setFilter] = useState<"today" | "date" | "all">("today");
  const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));
  const [search, setSearch] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("");
  const [searchPool, setSearchPool] = useState<Notification[] | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Notification | null>(null);
  const [form, setForm] = useState<NotifForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Selección múltiple
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showReport, setShowReport] = useState(false);
  const [deletingMultiple, setDeletingMultiple] = useState(false);

  // Modal de confirmación custom
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  function openConfirm(title: string, message: string, onConfirm: () => void) {
    setConfirmModal({ open: true, title, message, onConfirm });
  }

  function closeConfirm() {
    setConfirmModal((prev) => ({ ...prev, open: false }));
  }

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
    getDoc(doc(db, "users", user.uid)).then(async (snap) => {
      const data = snap.data();
      if (data?.branchConfig?.enabled) setBranchConfig(data.branchConfig as BranchConfig);
      setUserPlan(await checkPlanExpiry(db, user.uid, data ?? {}));
    });
    getDoc(doc(db, "config", "plans")).then((snap) => {
      const limit = snap.data()?.freeNotifLimit;
      if (limit) setNotifLimit(limit);
    });
    const done = localStorage.getItem(`nlistener_onboarding_done_${user.uid}`);
    if (!done) {
      getDocs(query(collection(db, "devices"), where("userId", "==", user.uid), where("active", "==", true), limit(1)))
        .then((snap) => {
          if (snap.size === 0) setShowWizard(true);
        });
    }
  }, [user]);

  async function fetchAggregates(uid: string) {
    try {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const todayQ = query(collection(db, "notifications"), where("userId", "==", uid), where("timestamp", ">=", todayStart));
      const monthQ = query(collection(db, "notifications"), where("userId", "==", uid), where("timestamp", ">=", monthStart));
      const allQ   = query(collection(db, "notifications"), where("userId", "==", uid));

      const [todaySnap, monthSnap, allSnap] = await Promise.all([
        getAggregateFromServer(todayQ, { total: sum("amount"), cobros: count() }),
        getAggregateFromServer(monthQ, { cobros: count() }),
        getAggregateFromServer(allQ,   { total: sum("amount"), cobros: count() }),
      ]);

      setTodayTotal(todaySnap.data().total ?? 0);
      setTodayCount(todaySnap.data().cobros ?? 0);
      setMonthCount(monthSnap.data().cobros ?? 0);
      setHistoricTotal(allSnap.data().total ?? 0);
      setHistoricCount(allSnap.data().cobros ?? 0);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("[fetchAggregates] Error:", err);
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdated) setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  async function handleManualRefresh() {
    if (!user || refreshing) return;
    setRefreshing(true);
    await fetchAggregates(user.uid);
    setRefreshing(false);
  }

  useEffect(() => {
    if (!user) return;
    // Reset older pages when user changes
    setOlderNotifs([]);
    lastVisibleRef.current = null;
    lastOlderRef.current = null;
    latestIdRef.current = null;

    fetchAggregates(user.uid);

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(PAGE_SIZE)
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notification[]);
      setHasMore(snap.docs.length === PAGE_SIZE);
      lastVisibleRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setLoading(false);
      // Re-calcular totales cuando llega una notificación nueva
      const latestId = snap.docs[0]?.id ?? null;
      if (latestId !== latestIdRef.current) {
        latestIdRef.current = latestId;
        fetchAggregates(user.uid);
      }
    });
    return unsub;
  }, [user]);

  async function loadMore() {
    if (!user || loadingMore) return;
    const cursor = lastOlderRef.current ?? lastVisibleRef.current;
    if (!cursor) return;
    setLoadingMore(true);
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc"),
      startAfter(cursor),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const newItems = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notification[];
    setOlderNotifs((prev) => {
      const ids = new Set(prev.map((n) => n.id));
      return [...prev, ...newItems.filter((n) => !ids.has(n.id))];
    });
    setHasMore(snap.docs.length === PAGE_SIZE);
    lastOlderRef.current = snap.docs[snap.docs.length - 1] ?? null;
    setLoadingMore(false);
  }

  const allNotifications = useMemo(() => {
    const ids = new Set(notifications.map((n) => n.id));
    return [...notifications, ...olderNotifs.filter((n) => !ids.has(n.id))];
  }, [notifications, olderNotifs]);

  // Cuando hay búsqueda activa y filtro por día, cargar todos los docs de ese rango
  useEffect(() => {
    if (!user || !search.trim() || filter === "all") {
      setSearchPool(null);
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      let startDate: Date, endDate: Date;
      if (filter === "today") {
        startDate = new Date(); startDate.setHours(0, 0, 0, 0);
        endDate   = new Date(); endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = new Date(selectedDate + "T00:00:00");
        endDate   = new Date(selectedDate + "T23:59:59.999");
      }
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("timestamp", ">=", startDate),
        where("timestamp", "<=", endDate),
        orderBy("timestamp", "desc")
      );
      const snap = await getDocs(q).catch(() => null);
      if (snap) setSearchPool(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notification[]);
    }, 400);
  }, [user, search, filter, selectedDate]);

  const uniqueDevices = useMemo(() => {
    const names = new Set<string>();
    for (const n of allNotifications) {
      if (n.deviceName) names.add(n.deviceName);
    }
    return Array.from(names).sort();
  }, [allNotifications]);

  const filtered = useMemo(() => {
    // searchPool ya viene filtrado por fecha desde Firestore
    let base = searchPool ?? allNotifications;
    if (!searchPool) {
      if (filter === "today") base = allNotifications.filter((n) => n.timestamp && isToday(n.timestamp));
      else if (filter === "date") base = allNotifications.filter((n) => n.timestamp && isSameDay(n.timestamp, selectedDate));
    }
    if (deviceFilter) base = base.filter((n) => n.deviceName === deviceFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter((n) =>
        n.text.toLowerCase().includes(q) ||
        n.app.toLowerCase().includes(q) ||
        (n.deviceName ?? "").toLowerCase().includes(q)
      );
    }
    return base;
  }, [allNotifications, searchPool, filter, selectedDate, search, deviceFilter]);

  // Resetear selección cuando cambia el filtro
  useEffect(() => { setSelected(new Set()); }, [filter, selectedDate, search]);

  const monthNotifCount = useMemo(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return allNotifications.filter((n) => {
      const ts = n.timestamp instanceof Date ? n.timestamp : n.timestamp?.toDate?.();
      return ts && ts >= startOfMonth;
    }).length;
  }, [allNotifications]);

  // — Selección —
  const allSelected = filtered.length > 0 && filtered.every((n) => selected.has(n.id));
  const someSelected = selected.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((n) => n.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
      const updates = {
        text: form.text.trim(),
        app: form.app.trim() || "Manual",
        amount: isNaN(amount as number) ? null : amount,
        timestamp,
      };
      await updateDoc(doc(db, "notifications", editing.id), updates);
      const applyUpdate = (n: Notification) => n.id === editing.id ? { ...n, ...updates } : n;
      setOlderNotifs((prev) => prev.map(applyUpdate));
      setSearchPool((prev) => prev ? prev.map(applyUpdate) : null);
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
    openConfirm(
      "Eliminar notificación",
      "¿Estás seguro que querés eliminar esta notificación? Esta acción no se puede deshacer.",
      async () => {
        closeConfirm();
        setDeleting(id);
        await deleteDoc(doc(db, "notifications", id));
        setOlderNotifs((prev) => prev.filter((n) => n.id !== id));
        setSearchPool((prev) => prev ? prev.filter((n) => n.id !== id) : null);
        setDeleting(null);
      }
    );
  }

  async function handleDeleteSelected() {
    const count = selected.size;
    openConfirm(
      "Eliminar notificaciones",
      `¿Estás seguro que querés eliminar ${count} notificación${count > 1 ? "es" : ""}? Esta acción no se puede deshacer.`,
      async () => {
        closeConfirm();
        setDeletingMultiple(true);
        const batch = writeBatch(db);
        selected.forEach((id) => batch.delete(doc(db, "notifications", id)));
        await batch.commit();
        setOlderNotifs((prev) => prev.filter((n) => !selected.has(n.id)));
        setSearchPool((prev) => prev ? prev.filter((n) => !selected.has(n.id)) : null);
        setSelected(new Set());
        setDeletingMultiple(false);
      }
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Tus cobros en tiempo real</p>
      </div>

      {/* Indicador en vivo */}
      <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
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

      {/* Límite free */}
      {userPlan === "free" && (
        <div className={`mb-6 rounded-xl border px-4 py-3 flex items-center gap-3 ${monthCount >= notifLimit ? "bg-red-50 border-red-200" : monthCount >= notifLimit * 0.8 ? "bg-yellow-50 border-yellow-200" : "bg-gray-50 border-gray-200"}`}>
          {monthCount >= notifLimit * 0.8 && (
            <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${monthCount >= notifLimit ? "text-red-500" : "text-yellow-500"}`} />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-700">Notificaciones este mes</span>
              <span className={`text-xs font-semibold ${monthCount >= notifLimit ? "text-red-600" : "text-gray-600"}`}>
                {monthCount} / {notifLimit}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${monthCount >= notifLimit ? "bg-red-500" : monthCount >= notifLimit * 0.8 ? "bg-yellow-500" : "bg-blue-500"}`}
                style={{ width: `${Math.min(100, (monthCount / notifLimit) * 100)}%` }}
              />
            </div>
          </div>
          {monthCount >= notifLimit * 0.8 && (
            <a href="/upgrade" className="flex-shrink-0 text-xs font-medium text-blue-600 hover:underline">
              Mejorar plan →
            </a>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={<TrendingUp className="w-4 h-4 text-green-600" />} label="Total hoy" value={formatCurrency(todayTotal)} sub={`${todayCount} cobros`} color="bg-green-50" />
        <StatCard icon={<Bell className="w-4 h-4 text-blue-600" />} label="Total histórico" value={formatCurrency(historicTotal)} sub={`${historicCount} cobros`} color="bg-blue-50" />
        <StatCard icon={<TrendingUp className="w-4 h-4 text-purple-600" />} label="Cobros este mes" value={String(monthCount)} sub={userPlan === "free" ? `límite ${notifLimit}` : undefined} color="bg-purple-50" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="px-4 md:px-6 py-4 border-b border-gray-100 space-y-3">
          {/* Fila 1: título + acciones + filtros (wrappea en mobile) */}
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-sm text-gray-900 mr-1">Notificaciones</h2>
            <button
              onClick={openAdd}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </button>
            {userPlan === "pro" && (
              <button
                onClick={() => setShowReport(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" />
                PDF
              </button>
            )}
            {someSelected && (
              <button
                onClick={handleDeleteSelected}
                disabled={deletingMultiple}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deletingMultiple ? "Eliminando..." : `Eliminar ${selected.size}`}
              </button>
            )}
            {/* Filtros al final de la fila, van a la siguiente línea en mobile si no caben */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 ml-auto">
              <FilterBtn active={filter === "today"} onClick={() => setFilter("today")}>Hoy</FilterBtn>
              <FilterBtn active={filter === "date"} onClick={() => setFilter("date")}>Fecha</FilterBtn>
              <FilterBtn active={filter === "all"} onClick={() => setFilter("all")}>Todas</FilterBtn>
            </div>
          </div>

          {/* Fila 2: fecha + dispositivo + búsqueda */}
          <div className="flex flex-wrap gap-2">
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
            {uniqueDevices.length > 1 && (
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Todos los dispositivos</option>
                {uniqueDevices.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar..."
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
          <div className="overflow-x-auto" id="notif-table">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-3 md:px-6 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="hidden md:table-cell text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Fuente</th>
                  <th className="hidden md:table-cell text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">App</th>
                  <th className="hidden lg:table-cell text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Dispositivo</th>
                  <th className="text-left px-3 md:px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Notificación</th>
                  <th className="text-right px-3 md:px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Monto</th>
                  <th className="hidden sm:table-cell text-right px-3 md:px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Hora</th>
                  {branchConfig && <th className="hidden sm:table-cell text-left px-3 md:px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">Sucursal</th>}
                  <th className="px-2 md:px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((n) => (
                  <tr
                    key={n.id}
                    className={`hover:bg-gray-50 transition-colors group ${selected.has(n.id) ? "bg-blue-50 hover:bg-blue-50" : ""}`}
                  >
                    <td className="px-3 md:px-6 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={selected.has(n.id)}
                        onChange={() => toggleSelect(n.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="hidden md:table-cell px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[n.source] ?? "bg-gray-100 text-gray-600"}`}>
                        {n.source === "android" ? <Smartphone className="w-3 h-3" /> : <Globe className="w-3 h-3" />}
                        {SOURCE_LABELS[n.source] ?? n.source}
                      </span>
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 text-gray-600">{n.app}</td>
                    <td className="hidden lg:table-cell px-6 py-3 text-gray-600 whitespace-nowrap">{n.deviceName ?? "—"}</td>
                    <td className="px-3 md:px-6 py-3 text-gray-700 max-w-[200px] md:max-w-sm break-words">{n.text}</td>
                    <td className="px-3 md:px-6 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                      {n.amount !== null ? formatCurrency(n.amount) : "—"}
                    </td>
                    <td className="hidden sm:table-cell px-3 md:px-6 py-3 text-right text-gray-400 whitespace-nowrap">
                      {n.timestamp ? formatDateShort(n.timestamp) : "—"}
                    </td>
                    {branchConfig && (
                      <td className="hidden sm:table-cell px-3 md:px-6 py-3">
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
                    <td className="px-2 md:px-6 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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

        {/* Cargar más */}
        {!loading && (hasMore || loadingMore) && !search.trim() && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {loadingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Cargando...
                </>
              ) : (
                "Cargar más notificaciones"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Onboarding wizard */}
      {showWizard && (
        <OnboardingWizard onDone={() => setShowWizard(false)} />
      )}

      {/* Modal editar/agregar */}
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

      {/* Modal reporte PDF */}
      {showReport && user && (
        <ReportModal userId={user.uid} onClose={() => setShowReport(false)} />
      )}

      {/* Modal de confirmación */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{confirmModal.title}</h3>
                <p className="text-sm text-gray-500">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={closeConfirm}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
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
