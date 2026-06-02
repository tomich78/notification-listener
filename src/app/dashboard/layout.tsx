"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, Settings, Smartphone, LogOut, Share2, Menu, X } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Cerrar sidebar al cambiar de página
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-gray-100">
        <Image src="/logo.webp" alt="NListener" width={36} height={36} className="rounded-lg" />
        <span className="font-bold text-sm text-gray-900">NListener</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <NavLink href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />}>
          Dashboard
        </NavLink>
        <NavLink href="/dashboard/devices" icon={<Smartphone className="w-4 h-4" />}>
          Dispositivos
        </NavLink>
        <NavLink href="/dashboard/settings" icon={<Settings className="w-4 h-4" />}>
          Configuración
        </NavLink>
        <NavLink href={`/view/${user.uid}`} icon={<Share2 className="w-4 h-4" />} external>
          Vista pública
        </NavLink>
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="px-2 py-1.5 mb-2">
          <p className="text-xs font-medium text-gray-900 truncate">{user.displayName}</p>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex">

      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-100 flex-col flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar mobile (drawer) */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-100 flex flex-col z-40
        transform transition-transform duration-200 ease-in-out md:hidden
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
        </button>
        {sidebarContent}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar mobile */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Image src="/logo.webp" alt="NListener" width={28} height={28} className="rounded-md" />
            <span className="font-bold text-sm text-gray-900">NListener</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  external?: boolean;
}) {
  const pathname = usePathname();
  const isActive = !external && (pathname === href || (href !== "/dashboard" && pathname.startsWith(href)));

  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className={`flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-lg transition-colors ${
        isActive
          ? "bg-blue-50 text-blue-700 font-medium"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}
