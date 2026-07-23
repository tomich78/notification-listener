"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { branchLabel, branchLabelPlural, branchLabelPluralLower } from "@/lib/branchLabel";
import { Notification, Device, BranchConfig } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { X, FileDown, Loader2 } from "lucide-react";

interface Props {
  userId: string;
  onClose: () => void;
}

function toLocalDateString(date: Date) {
  return date.toLocaleDateString("en-CA");
}

export default function ReportModal({ userId, onClose }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [branchConfig, setBranchConfig] = useState<BranchConfig | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const [date, setDate] = useState(toLocalDateString(new Date()));
  const [generating, setGenerating] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(true);

  useEffect(() => {
    // Cargar dispositivos y config de sucursales en paralelo
    Promise.all([
      getDocs(query(collection(db, "devices"), where("userId", "==", userId))),
      getDoc(doc(db, "users", userId)),
    ]).then(([devSnap, userSnap]) => {
      const devs = devSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Device[];
      setDevices(devs);
      setSelectedDevices(new Set(devs.map(d => d.id)));

      const userData = userSnap.data();
      const bc: BranchConfig | null = userData?.branchConfig ?? null;
      if (bc?.enabled && bc.branches.length > 0) {
        setBranchConfig(bc);
        setSelectedBranches(new Set(bc.branches.map(b => b.id)));
      }

      setLoadingDevices(false);
    });
  }, [userId]);

  function toggleBranch(id: string) {
    setSelectedBranches(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleDevice(id: string) {
    setSelectedDevices(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function generatePDF() {
    setGenerating(true);
    try {
      // Traer notificaciones del día seleccionado
      const startOfDay = new Date(date + "T00:00:00");
      const endOfDay = new Date(date + "T23:59:59");

      const snap = await getDocs(query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        where("timestamp", ">=", startOfDay),
        where("timestamp", "<=", endOfDay),
        orderBy("timestamp", "asc")
      ));

      let notifications = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Notification[];

      // Filtrar por dispositivos seleccionados (incluir manuales si no hay deviceId)
      if (selectedDevices.size < devices.length) {
        notifications = notifications.filter(n =>
          !n.deviceId || selectedDevices.has(n.deviceId)
        );
      }

      // Filtrar por sucursales si el modo está activo
      if (branchConfig?.enabled && branchConfig.branches.length > 0 && selectedBranches.size < branchConfig.branches.length) {
        notifications = notifications.filter(n =>
          n.branchId ? selectedBranches.has(n.branchId) : false
        );
      }

      // Importar jsPDF dinámicamente
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const dateFormatted = new Date(date + "T12:00:00").toLocaleDateString("es-AR", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });
      const total = notifications.reduce((s, n) => s + (n.amount ?? 0), 0);
      const totalStr = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(total);

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("NListener", 14, 12);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Reporte de cobros", 14, 20);

      // Fecha
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1), 14, 40);

      // Subtítulos: dispositivos y/o sucursales
      let subtitleY = 48;
      if (selectedDevices.size < devices.length) {
        const names = devices.filter(d => selectedDevices.has(d.id)).map(d => d.name).join(", ");
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`Dispositivos: ${names}`, 14, subtitleY);
        subtitleY += 6;
      }
      if (branchConfig?.enabled && branchConfig.branches.length > 0 && selectedBranches.size < branchConfig.branches.length) {
        const names = branchConfig.branches.filter(b => selectedBranches.has(b.id)).map(b => b.name).join(", ");
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`${branchLabelPlural(branchConfig.label)}: ${names}`, 14, subtitleY);
      }

      // Resumen
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(14, 54, 85, 22, 3, 3, "F");
      doc.setTextColor(37, 99, 235);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("TOTAL DEL DÍA", 22, 62);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(totalStr, 22, 72);

      doc.setFillColor(240, 253, 244);
      doc.roundedRect(109, 54, 87, 22, 3, 3, "F");
      doc.setTextColor(22, 163, 74);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("CANTIDAD DE COBROS", 117, 62);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`${notifications.length}`, 117, 72);

      // Tabla
      const hasBranches = branchConfig?.enabled && branchConfig.branches.length > 0;

      const rows = notifications.map(n => {
        const ts = n.timestamp instanceof Date ? n.timestamp : (n.timestamp as { toDate: () => Date })?.toDate?.() ?? new Date();
        const hora = ts.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
        const monto = n.amount !== null
          ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(n.amount)
          : "—";
        const deviceName = devices.find(d => d.id === n.deviceId)?.name ?? "Manual";
        const branchName = hasBranches
          ? (branchConfig!.branches.find(b => b.id === n.branchId)?.name ?? "—")
          : null;
        return hasBranches
          ? [hora, n.app, n.text.slice(0, 55) + (n.text.length > 55 ? "..." : ""), deviceName, branchName, monto]
          : [hora, n.app, n.text.slice(0, 60) + (n.text.length > 60 ? "..." : ""), deviceName, monto];
      });

      autoTable(doc, {
        startY: 84,
        head: [hasBranches
          ? ["Hora", "App", "Notificación", "Dispositivo", branchLabel(branchConfig?.label), "Monto"]
          : ["Hora", "App", "Notificación", "Dispositivo", "Monto"]
        ],
        body: rows,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: hasBranches ? {
          0: { cellWidth: 13 },
          1: { cellWidth: 22 },
          2: { cellWidth: 65 },
          3: { cellWidth: 28 },
          4: { cellWidth: 28 },
          5: { cellWidth: 24, halign: "right" },
        } : {
          0: { cellWidth: 15 },
          1: { cellWidth: 25 },
          2: { cellWidth: 80 },
          3: { cellWidth: 30 },
          4: { cellWidth: 30, halign: "right" },
        },
      });

      // Footer
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.text(`Generado por NListener · nlistener.com.ar`, 14, 290);
        doc.text(`Página ${i} de ${pageCount}`, 196, 290, { align: "right" });
      }

      doc.save(`reporte-${date}.pdf`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-gray-900">Generar reporte PDF</h3>
            <p className="text-xs text-gray-400 mt-0.5">Exportá el resumen de cobros del día</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha</label>
            <input
              type="date"
              value={date}
              max={toLocalDateString(new Date())}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Dispositivos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Dispositivos a incluir
            </label>
            {loadingDevices ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando dispositivos...
              </div>
            ) : devices.length === 0 ? (
              <p className="text-sm text-gray-400">No hay dispositivos</p>
            ) : (
              <div className="space-y-2">
                {devices.map(d => (
                  <label key={d.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedDevices.has(d.id)}
                      onChange={() => toggleDevice(d.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{d.name}</span>
                    {!d.active && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactivo</span>}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Sucursales (solo si el modo está activo) */}
          {branchConfig?.enabled && branchConfig.branches.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {branchLabelPlural(branchConfig.label)} a incluir
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-2 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedBranches.size === branchConfig.branches.length}
                    onChange={() => {
                      if (selectedBranches.size === branchConfig.branches.length) {
                        setSelectedBranches(new Set());
                      } else {
                        setSelectedBranches(new Set(branchConfig.branches.map(b => b.id)));
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-600">Todas las {branchLabelPluralLower(branchConfig.label)}</span>
                </label>
                <div className="border-t border-gray-100 pt-2 space-y-1.5">
                  {branchConfig.branches.map(b => (
                    <label key={b.id} className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedBranches.has(b.id)}
                        onChange={() => toggleBranch(b.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: b.color }}
                      />
                      <span className="text-sm text-gray-700">{b.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={generatePDF}
            disabled={generating || selectedDevices.size === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Generando...</>
            ) : (
              <><FileDown className="w-4 h-4" />Descargar PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
