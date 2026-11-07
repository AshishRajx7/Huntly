"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  ExternalLink,
  Plus,
  Power,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface CompanyItem {
  id: string;
  name: string;
  atsProvider: "ashby" | "greenhouse" | "lever";
  atsToken: string;
  websiteUrl?: string;
  careerPageUrl?: string;
  logoUrl?: string;
  isActive: boolean;
  lastSyncedAt?: string;
  createdAt: string;
  activeJobsCount: number;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncingCompanyId, setSyncingCompanyId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formProvider, setFormProvider] = useState<"ashby" | "greenhouse" | "lever">("ashby");
  const [formToken, setFormToken] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  async function fetchCompanies() {
    setLoading(true);
    try {
      const res = await fetch("/api/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load companies", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: string, currentActive: boolean) {
    try {
      const res = await fetch("/api/companies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: !currentActive }),
      });
      if (res.ok) {
        setCompanies((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isActive: !currentActive } : c))
        );
      }
    } catch (err) {
      console.error("Failed to toggle company", err);
    }
  }

  async function handleSyncSingle(companyId: string) {
    setSyncingCompanyId(companyId);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (res.ok) {
        fetchCompanies();
      }
    } catch (err) {
      console.error("Failed to sync company", err);
    } finally {
      setSyncingCompanyId(null);
    }
  }

  async function handleAddCompany(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          atsProvider: formProvider,
          atsToken: formToken,
          careerPageUrl: formUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to add company");
        return;
      }

      setShowAddModal(false);
      setFormName("");
      setFormUrl("");
      setFormToken("");
      fetchCompanies();
    } catch {
      setFormError("Network error adding company");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.atsToken.toLowerCase().includes(search.toLowerCase());
    const matchesProvider = providerFilter ? c.atsProvider === providerFilter : true;
    return matchesSearch && matchesProvider;
  });

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-indigo-400" />
            Company Registry
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Tracking {companies.length} verified startup ATS boards across Ashby, Greenhouse, and Lever
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Company</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies by name or slug..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="">All ATS Platforms</option>
          <option value="ashby">Ashby</option>
          <option value="greenhouse">Greenhouse</option>
          <option value="lever">Lever</option>
        </select>
      </div>

      {/* Companies Table */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading company registry...</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">ATS Provider</th>
                <th className="py-3 px-4">Active Jobs</th>
                <th className="py-3 px-4">Last Synced</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredCompanies.map((c) => {
                const isSyncing = syncingCompanyId === c.id;

                return (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      <div className="flex items-center gap-2">
                        <span>{c.name}</span>
                        {c.careerPageUrl && (
                          <a
                            href={c.careerPageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-indigo-400"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-mono font-bold bg-slate-800 text-slate-300">
                        {c.atsProvider}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-300">
                      {c.activeJobsCount}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {c.lastSyncedAt
                        ? new Date(c.lastSyncedAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Never"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.isActive
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {c.isActive ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSyncSingle(c.id)}
                          disabled={isSyncing}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer disabled:opacity-50"
                          title="Sync jobs for this company"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-indigo-400" : ""}`}
                          />
                        </button>
                        <button
                          onClick={() => handleToggle(c.id, c.isActive)}
                          className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                            c.isActive
                              ? "bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400"
                              : "bg-slate-800 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400"
                          }`}
                          title={c.isActive ? "Pause ingestion" : "Resume ingestion"}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-100">Add New Company Board</h3>
            <p className="text-xs text-slate-400">
              Provide company details or a job board link (Ashby, Greenhouse, or Lever)
            </p>

            <form onSubmit={handleAddCompany} className="space-y-3">
              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Cursor"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  ATS Provider *
                </label>
                <select
                  value={formProvider}
                  onChange={(e) =>
                    setFormProvider(e.target.value as "ashby" | "greenhouse" | "lever")
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ashby">Ashby</option>
                  <option value="greenhouse">Greenhouse</option>
                  <option value="lever">Lever</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  ATS Board Token / Slug *
                </label>
                <input
                  type="text"
                  required
                  value={formToken}
                  onChange={(e) => setFormToken(e.target.value)}
                  placeholder="e.g. cursor or posthog"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Career Page URL (Optional)
                </label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://jobs.ashbyhq.com/cursor"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Adding..." : "Add & Ingest"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

