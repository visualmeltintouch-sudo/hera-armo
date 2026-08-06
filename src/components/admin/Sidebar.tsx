"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/events", label: "Eventi", icon: "📅" },
  { href: "/admin/questions", label: "Domande", icon: "❓" },
  { href: "/admin/profiles", label: "Profili", icon: "🎨" },
  { href: "/admin/prizes", label: "Premi", icon: "🎁" },
  { href: "/admin/operators", label: "Operatori", icon: "👤" },
  { href: "/admin/codes", label: "Codici", icon: "🔑" },
  { href: "/admin/stats", label: "Statistiche", icon: "📊" },
  { href: "/admin/settings", label: "Impostazioni", icon: "⚙️" },
];

interface SidebarProps {
  onLogout: () => void;
  userEmail: string;
}

export function Sidebar({ onLogout, userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col min-h-screen">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-lg font-bold text-white">Armocromia</h1>
        <p className="text-xs text-gray-500 mt-1">HERA Admin</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-cyan-600/20 text-cyan-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-500 truncate mb-3">{userEmail}</p>
        <button
          onClick={onLogout}
          className="w-full text-sm text-gray-400 hover:text-red-400 transition-colors text-left"
        >
          Esci
        </button>
      </div>
    </aside>
  );
}
