"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Sparkles,
  TrendingUp,
  Clock,
  CheckCircle2,
  Building2,
  RefreshCw,
  ExternalLink,
  MapPin,
  DollarSign,
  ArrowRight,
  Bookmark,
  Check,
} from "lucide-react";

interface OverviewMetrics {
  totalActiveJobs: number;
  discoveredToday: number;
  discoveredLast7Days: number;
  matchingCount: number;
  highAffinityCount: number;
  totalApplications: number;
  activeCompanies: number;
  appStatuses: Array<{ status: string; count: number }>;
  lastSync: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
    jobsFetched: number;
    newJobsCount: number;
  } | null;
}

interface TopMatch {
  id: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  location?: string;
  isRemote: boolean;
  remoteEligibility: string;
  salaryFormatted: string;
  experienceClassification: string;
  applicationUrl: string;
  firstDiscoveredDate: string;
  matchScore: number;
  matchExplanation: string;
  matchedSkills: string;
  matchStatus: string;
}

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [topMatches, setTopMatches] = useState<TopMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/api/overview");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setTopMatches(data.topMatches || []);
      }
    } catch (err) {
      console.error("Failed to load overview data", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleTriggerSync() {
    if (syncing) return;
    setSyncing(true);
    setSyncStatusText("Fetching open positions from Ashby, Greenhouse, and Lever...");

    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncStatusText(
          `Sync complete: Scanned ${data.stats?.companiesCount || 0} companies, ingested ${data.stats?.jobsFetched || 0} jobs (${data.stats?.newJobsCount || 0} new) in ${(data.stats?.durationMs / 1000).toFixed(1)}s`
        );
        fetchData();
      } else {
        setSyncStatusText("Sync encountered an error");
      }
    } catch {
      setSyncStatusText("Sync request failed");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSaveJob(jobId: string, companyName: string, jobTitle: string, appUrl: string) {
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          companyName,
          jobTitle,
          applicationUrl: appUrl,
          status: "saved",
        }),
      });
      if (res.ok) {
        setSavedJobIds((prev) => new Set([...prev, jobId]));
      }
    } catch (err) {
      console.error("Failed to save job", err);
    }
  }

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
            Job Discovery Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Tracking startup and direct ATS engineering opportunities matching your profile
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTriggerSync}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Synchronizing ATS..." : "Sync Jobs Now"}</span>
          </button>
        </div>
      </div>

      {syncStatusText && (
        <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs flex items-center justify-between">
          <span className="font-medium">{syncStatusText}</span>
          <button
            onClick={() => setSyncStatusText(null)}
            className="text-indigo-400 hover:text-indigo-200 cursor-pointer ml-4 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Jobs */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Active Jobs
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100">
              {loading ? "..." : metrics?.totalActiveJobs.toLocaleString() || 0}
            </span>
            <span className="text-xs text-slate-400">
              from {metrics?.activeCompanies || 0} verified companies
            </span>
          </div>
        </div>

        {/* AI Matches */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Target Matches
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-400">
              {loading ? "..." : metrics?.matchingCount || 0}
            </span>
            <span className="text-xs text-slate-400">
              ({metrics?.highAffinityCount || 0} high affinity &ge;80%)
            </span>
          </div>
        </div>

        {/* Discovered Recently */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Discovered This Week
            </span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100">
              {loading ? "..." : metrics?.discoveredLast7Days || 0}
            </span>
            <span className="text-xs text-slate-400">
              ({metrics?.discoveredToday || 0} discovered today)
            </span>
          </div>
        </div>

        {/* Applications Tracked */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Tracked Applications
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-100">
              {loading ? "..." : metrics?.totalApplications || 0}
            </span>
            <Link
              href="/applications"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium ml-auto flex items-center gap-1"
            >
              View Board <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* High Affinity Matches Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              Top AI Matches for Your Profile
            </h2>
            <p className="text-xs text-slate-400">
              Sorted by candidate affinity (Node.js, TypeScript, PostgreSQL • 0-2 yrs • Bangalore & Worldwide)
            </p>
          </div>
          <Link
            href="/matches"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
          >
            Explore all {metrics?.matchingCount || 0} matches <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {topMatches.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-3">
            <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm">No jobs synced yet. Hit &quot;Sync Jobs Now&quot; above to ingest opportunities.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topMatches.map((job) => {
              const skills: string[] = job.matchedSkills ? JSON.parse(job.matchedSkills) : [];
              const isSaved = savedJobIds.has(job.id);

              return (
                <div
                  key={job.id}
                  className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    {/* Header: Company & Score Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-indigo-400 block truncate">
                          {job.companyName}
                        </span>
                        <h3 className="font-semibold text-slate-100 text-base leading-snug line-clamp-2 mt-0.5 group-hover:text-white">
                          {job.jobTitle}
                        </h3>
                      </div>
                      <div
                        className={`shrink-0 px-2.5 py-1 rounded-xl font-bold text-xs border ${
                          job.matchScore >= 80
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                        }`}
                      >
                        {job.matchScore}% Match
                      </div>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="truncate max-w-[140px]">{job.location || "Remote"}</span>
                      </span>
                      <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md">
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                        <span>{job.salaryFormatted}</span>
                      </span>
                      <span className="bg-slate-800/80 px-2 py-0.5 rounded-md text-[11px] text-slate-300">
                        {job.experienceClassification}
                      </span>
                    </div>

                    {/* AI Explanation snippet */}
                    <p className="text-xs text-slate-400 line-clamp-2 italic bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                      &ldquo;{job.matchExplanation}&rdquo;
                    </p>

                    {/* Overlapping skills badges */}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {skills.slice(0, 4).map((skill) => (
                          <span
                            key={skill}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-950/60 text-indigo-300 border border-indigo-900/60"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800/60">
                    <button
                      onClick={() =>
                        handleSaveJob(job.id, job.companyName, job.jobTitle, job.applicationUrl)
                      }
                      disabled={isSaved}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSaved
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                    >
                      {isSaved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                      <span>{isSaved ? "Saved" : "Save"}</span>
                    </button>

                    <a
                      href={job.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
                    >
                      <span>Direct Apply</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

