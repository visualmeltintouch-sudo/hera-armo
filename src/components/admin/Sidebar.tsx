"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/events", label: "Eventi", icon: "📅" },
  { href: "/admin/questions", label: "Domande", icon: "❓" },
  { href: "/admin/profiles", label: "Profili", icon: "🎨" },
  { href: "/admin/prizes", label: "Premi", icon: "🎁" },
  { href: "/admin/operators", label: "Operatori", icon: "👤" },
  { href: "/admin/codes", label: "Codici", icon: "🔑" },
  { href: "/admin/settings", label: "Impostazioni", icon: "⚙️" },
];

interface SidebarProps {
  onLogout: () => void;
  userEmail: string;
}

export function Sidebar({ onLogout, userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col min-h-screen">
      <div className="p-6 border-b border-border space-y-3">
        <img src="/brand/hera-logo.webp" alt="Gruppo Hera" className="h-8 w-auto" />
        <div>
          <h1 className="text-lg font-bold text-foreground">Armocromia</h1>
          <p className="text-xs text-muted-foreground mt-1">Admin</p>
        </div>
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
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground truncate mb-3">{userEmail}</p>
        <button
          onClick={onLogout}
          className="w-full text-sm text-muted-foreground hover:text-destructive transition-colors text-left"
        >
          Esci
        </button>
      </div>
    </aside>
  );
}
