"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sparkles,
  MapPin,
  DollarSign,
  ExternalLink,
  Bookmark,
  Check,
  EyeOff,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface MatchItem {
  matchId: number;
  jobId: string;
  matchScore: number;
  matchExplanation: string;
  matchReasons: string;
  matchedSkills: string;
  missingSkills: string;
  isEarlyCareer: boolean;
  roleRelevanceScore: number;
  techSkillsScore: number;
  experienceScore: number;
  locationScore: number;
  salaryScore: number;
  matchStatus: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  location?: string;
  isRemote: boolean;
  remoteEligibility: string;
  employmentType: string;
  salaryFormatted: string;
  experienceClassification: string;
  applicationUrl: string;
  firstDiscoveredDate: string;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/matches?tab=${activeTab}&page=${page}&limit=12`);
      if (res.ok) {
        const data = await res.json();
        setMatches(data.items || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to load matches", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  async function updateMatchStatus(matchId: number, status: "saved" | "applied" | "dismissed") {
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setMatches((prev) =>
          prev.map((m) => (m.matchId === matchId ? { ...m, matchStatus: status } : m))
        );
        if (status === "dismissed") {
          // Remove from view
          setMatches((prev) => prev.filter((m) => m.matchId !== matchId));
        }
      }
    } catch (err) {
      console.error("Failed to update match status", err);
    }
  }

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2.5">
          <Sparkles className="w-7 h-7 text-indigo-400" />
          AI Candidate Matches
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Opportunities specifically matched against your candidate profile (~1 yr exp, Node.js/TypeScript/Postgres, Bangalore/Global Remote)
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: "all", label: "All Matches" },
          { id: "high", label: "High Affinity (≥80%)" },
          { id: "early_career", label: "Early Career (0–2 yrs)" },
          { id: "india_remote", label: "Bangalore & Worldwide" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Matches List */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Evaluating job alignments...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-2">
          <Sparkles className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-medium">No matches found for this filter</p>
          <p className="text-xs text-slate-500">Switch tabs or sync newly posted listings</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((item) => {
            const reasons: string[] = item.matchReasons ? JSON.parse(item.matchReasons) : [];
            const matchedSkills: string[] = item.matchedSkills ? JSON.parse(item.matchedSkills) : [];
            const missingSkills: string[] = item.missingSkills ? JSON.parse(item.missingSkills) : [];

            return (
              <div
                key={item.matchId}
                className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 transition-all space-y-4"
              >
                {/* Header Row: Title, Company, Score */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-indigo-400">
                      {item.companyName}
                    </span>
                    <h3 className="text-lg font-bold text-slate-100 hover:text-white">
                      {item.jobTitle}
                    </h3>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{item.location || "Remote"}</span>
                      </span>
                      <span className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded-md">
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                        <span>{item.salaryFormatted}</span>
                      </span>
                      <span className="bg-slate-800 px-2 py-0.5 rounded-md text-slate-300">
                        {item.experienceClassification}
                      </span>
                      <span className="bg-slate-800/60 px-2 py-0.5 rounded-md text-slate-400 uppercase text-[10px]">
                        {item.remoteEligibility}
                      </span>
                    </div>
                  </div>

                  {/* Match Score Badge */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                    <div
                      className={`px-3.5 py-1.5 rounded-xl font-extrabold text-sm border flex items-center gap-1.5 ${
                        item.matchScore >= 80
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : item.matchScore >= 60
                          ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                          : "bg-slate-800 text-slate-300 border-slate-700"
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{item.matchScore}% Match</span>
                    </div>

                    {item.isEarlyCareer && (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        Early Career Friendly
                      </span>
                    )}
                  </div>
                </div>

                {/* AI Explanation & Match Reasons */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    {item.matchExplanation}
                  </p>

                  {reasons.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {reasons.map((r, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1"
                        >
                          <span className="text-emerald-400 font-bold">•</span> {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sub-scores breakdown */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-center">
                    <span className="text-slate-500 block">Role Fit</span>
                    <span className="font-bold text-slate-200">{item.roleRelevanceScore}/100</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-center">
                    <span className="text-slate-500 block">Tech Skills</span>
                    <span className="font-bold text-slate-200">{item.techSkillsScore}/100</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-center">
                    <span className="text-slate-500 block">Experience</span>
                    <span className="font-bold text-slate-200">{item.experienceScore}/100</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-center">
                    <span className="text-slate-500 block">Location</span>
                    <span className="font-bold text-slate-200">{item.locationScore}/100</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-center">
                    <span className="text-slate-500 block">Salary</span>
                    <span className="font-bold text-slate-200">{item.salaryScore}/100</span>
                  </div>
                </div>

                {/* Skills Overlap */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-medium">Matched Skills:</span>
                    <div className="flex flex-wrap gap-1">
                      {matchedSkills.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 rounded-md text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateMatchStatus(item.matchId, "saved")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        item.matchStatus === "saved"
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{item.matchStatus === "saved" ? "Saved" : "Save Job"}</span>
                    </button>

                    <button
                      onClick={() => updateMatchStatus(item.matchId, "applied")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        item.matchStatus === "applied"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{item.matchStatus === "applied" ? "Applied" : "Mark Applied"}</span>
                    </button>

                    <button
                      onClick={() => updateMatchStatus(item.matchId, "dismissed")}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Dismiss</span>
                    </button>
                  </div>

                  <a
                    href={item.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
                  >
                    <span>Direct ATS Apply</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            Showing Page <span className="font-semibold text-slate-200">{page}</span> of{" "}
            <span className="font-semibold text-slate-200">{totalPages}</span>
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

