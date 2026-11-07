"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Compass,
  Sparkles,
  ClipboardList,
  Building2,
  RefreshCw,
  Target,
  MapPin,
  Code2,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { name: "Overview", href: "/", icon: LayoutDashboard },
  { name: "Discover Jobs", href: "/discover", icon: Compass },
  { name: "AI Matches", href: "/matches", icon: Sparkles, badge: "AI" },
  { name: "Applications", href: "/applications", icon: ClipboardList },
  { name: "Companies", href: "/companies", icon: Building2 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  async function handleQuickSync() {
    if (syncing) return;
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncResult(`Synced ${data.stats?.jobsFetched || 0} jobs`);
        setTimeout(() => setSyncResult(null), 4000);
        window.location.reload();
      } else {
        setSyncResult("Sync failed");
      }
    } catch {
      setSyncResult("Sync error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <aside className="w-64 bg-[#0F172A]/90 border-r border-slate-800/80 flex flex-col h-screen fixed left-0 top-0 z-30 backdrop-blur-md">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-100 tracking-tight flex items-center gap-1.5">
              Huntly
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-400">AI Job Discovery</p>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Profile Overview Card */}
      <div className="px-3 pb-3">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between font-semibold text-slate-300">
            <span>Target Profile</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              Active
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Code2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Node.js • TypeScript • 0-2 yrs</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Bangalore • Global Remote</span>
          </div>
        </div>
      </div>

      {/* Sync Footer Action */}
      <div className="p-3 border-t border-slate-800/80">
        <button
          onClick={handleQuickSync}
          disabled={syncing}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-indigo-400" : ""}`} />
          <span>{syncing ? "Syncing ATS..." : "Sync All ATS"}</span>
        </button>
        {syncResult && (
          <p className="mt-1.5 text-[11px] text-center text-emerald-400 font-medium">
            {syncResult}
          </p>
        )}
      </div>
    </aside>
  );
}

