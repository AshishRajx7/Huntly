"use client";

import { useEffect, useState } from "react";
import {
  ClipboardList,
  ExternalLink,
  Trash2,
  Edit3,
  Calendar,
  Check,
  Plus,
  Building2,
  DollarSign,
  MapPin,
} from "lucide-react";

interface ApplicationItem {
  id: number;
  jobId: string;
  companyName: string;
  jobTitle: string;
  applicationUrl: string;
  status: "saved" | "applied" | "screening" | "interview" | "offer" | "rejected";
  appliedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  location?: string;
  salaryFormatted?: string;
  isRemote?: boolean;
}

const COLUMNS: Array<{
  id: ApplicationItem["status"];
  label: string;
  color: string;
  border: string;
}> = [
  { id: "saved", label: "Saved", color: "bg-slate-500/10 text-slate-400", border: "border-slate-700/60" },
  { id: "applied", label: "Applied", color: "bg-blue-500/10 text-blue-400", border: "border-blue-500/30" },
  { id: "screening", label: "Screening", color: "bg-purple-500/10 text-purple-400", border: "border-purple-500/30" },
  { id: "interview", label: "Interview", color: "bg-amber-500/10 text-amber-400", border: "border-amber-500/30" },
  { id: "offer", label: "Offer", color: "bg-emerald-500/10 text-emerald-400", border: "border-emerald-500/30" },
  { id: "rejected", label: "Archived", color: "bg-rose-500/10 text-rose-400", border: "border-rose-500/20" },
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [tempNotes, setTempNotes] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    setLoading(true);
    try {
      const res = await fetch("/api/applications");
      if (res.ok) {
        const data = await res.json();
        setApplications(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load applications", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(id: number, newStatus: ApplicationItem["status"]) {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app))
        );
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  }

  async function handleSaveNotes(id: number) {
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: tempNotes }),
      });
      if (res.ok) {
        setApplications((prev) =>
          prev.map((app) => (app.id === id ? { ...app, notes: tempNotes } : app))
        );
        setEditingNotesId(null);
      }
    } catch (err) {
      console.error("Failed to update notes", err);
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setApplications((prev) => prev.filter((app) => app.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete application", err);
    }
  }

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2.5">
            <ClipboardList className="w-7 h-7 text-indigo-400" />
            Applications Pipeline
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track and organize your submitted and saved job applications
          </p>
        </div>

        <div className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-medium">
          Total Tracked: <span className="text-slate-100 font-bold">{applications.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading pipeline...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-2">
          <ClipboardList className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-medium">Your pipeline is currently empty</p>
          <p className="text-xs text-slate-500">
            Save jobs from &quot;Discover Jobs&quot; or &quot;AI Matches&quot; to track them here.
          </p>
        </div>
      ) : (
        /* Kanban Columns Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colApps = applications.filter((a) => a.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-3 space-y-3 min-h-[300px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-200">{col.label}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${col.color}`}
                    >
                      {colApps.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="space-y-3">
                  {colApps.map((app) => (
                    <div
                      key={app.id}
                      className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700/80 transition-all space-y-2.5 shadow-sm"
                    >
                      <div>
                        <span className="text-[11px] font-semibold text-indigo-400 block truncate">
                          {app.companyName}
                        </span>
                        <h4 className="text-xs font-bold text-slate-100 line-clamp-2 mt-0.5">
                          {app.jobTitle}
                        </h4>
                      </div>

                      {/* Details */}
                      {(app.location || app.salaryFormatted) && (
                        <div className="text-[11px] text-slate-400 space-y-0.5">
                          {app.location && (
                            <div className="flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{app.location}</span>
                            </div>
                          )}
                          {app.salaryFormatted && app.salaryFormatted !== "Not disclosed" && (
                            <div className="flex items-center gap-1 text-emerald-400 truncate">
                              <DollarSign className="w-3 h-3 shrink-0" />
                              <span className="truncate">{app.salaryFormatted}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Notes Section */}
                      {editingNotesId === app.id ? (
                        <div className="space-y-1.5 pt-1">
                          <textarea
                            value={tempNotes}
                            onChange={(e) => setTempNotes(e.target.value)}
                            placeholder="Add notes..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500"
                            rows={2}
                          />
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingNotesId(null)}
                              className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveNotes(app.id)}
                              className="text-[10px] px-2 py-0.5 rounded bg-indigo-600 text-white font-medium cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => {
                            setEditingNotesId(app.id);
                            setTempNotes(app.notes || "");
                          }}
                          className="text-[11px] text-slate-400 bg-slate-900/50 p-1.5 rounded-lg border border-slate-800/60 cursor-pointer hover:border-slate-700 line-clamp-2"
                        >
                          {app.notes || "Click to add notes..."}
                        </div>
                      )}

                      {/* Stage Selector */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-1">
                        <select
                          value={app.status}
                          onChange={(e) =>
                            handleStatusChange(app.id, e.target.value as ApplicationItem["status"])
                          }
                          className="bg-slate-900 text-[10px] text-slate-300 rounded px-1.5 py-0.5 border border-slate-800 focus:outline-none"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1">
                          <a
                            href={app.applicationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                            title="Open Application URL"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <button
                            onClick={() => handleDelete(app.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Remove Application"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

