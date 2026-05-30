"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Bell, LayoutDashboard, Settings, Smartphone, LogOut, Share2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
          <Bell className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-sm text-gray-900">NListener</span>
        </div>

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
          <NavLink
            href={`/view/${user.uid}`}
            icon={<Share2 className="w-4 h-4" />}
            external
          >
            Vista pública
          </NavLink>
        </nav>

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
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
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
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="flex items-center gap-2.5 px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}
