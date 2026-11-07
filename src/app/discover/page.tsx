"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Filter,
  MapPin,
  DollarSign,
  Briefcase,
  ExternalLink,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface JobItem {
  id: string;
  atsProvider: string;
  companyId: string;
  companyName: string;
  companyLogo?: string;
  jobTitle: string;
  cleanedDescription: string;
  location?: string;
  isRemote: boolean;
  remoteEligibility: string;
  employmentType: string;
  salaryFormatted: string;
  experienceClassification: string;
  extractedSkills: string;
  applicationUrl: string;
  firstDiscoveredDate: string;
  matchScore?: number;
  matchExplanation?: string;
  matchedSkills?: string;
}

export default function DiscoverPage() {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [remote, setRemote] = useState("");
  const [experience, setExperience] = useState("");
  const [ats, setAts] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [sort, setSort] = useState("match_score");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "18",
        sort,
      });

      if (search.trim()) params.append("q", search.trim());
      if (remote) params.append("remote", remote);
      if (experience) params.append("experience", experience);
      if (ats) params.append("ats", ats);
      if (minSalary) params.append("minSalary", minSalary);

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.items || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to load jobs", err);
    } finally {
      setLoading(false);
    }
  }, [search, remote, experience, ats, minSalary, sort, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  async function handleSaveJob(job: JobItem) {
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          companyName: job.companyName,
          jobTitle: job.jobTitle,
          applicationUrl: job.applicationUrl,
          status: "saved",
        }),
      });
      if (res.ok) {
        setSavedJobIds((prev) => new Set([...prev, job.id]));
      }
    } catch (err) {
      console.error("Failed to save job", err);
    }
  }

  return (
    <div className="p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight">
          Discover Jobs
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Explore and filter all {totalCount.toLocaleString()} aggregated startup opportunities
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by job title, company, or skills (e.g. Node.js, Backend, Sezzle)..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Filter dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Remote Eligibility */}
          <select
            value={remote}
            onChange={(e) => {
              setRemote(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Locations / Remote</option>
            <option value="any_remote">Any Remote</option>
            <option value="worldwide">Worldwide Remote</option>
            <option value="india">India Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
            <option value="us_only">US Only Remote</option>
          </select>

          {/* Experience */}
          <select
            value={experience}
            onChange={(e) => {
              setExperience(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Experience Levels</option>
            <option value="early_career">Early Career (0–2 yrs)</option>
            <option value="0-1">0–1 Years</option>
            <option value="1-2">1–2 Years</option>
            <option value="junior">Junior / Associate</option>
            <option value="unspecified">Unspecified (Open)</option>
            <option value="2-3">2–3 Years</option>
            <option value="3-5">3–5 Years</option>
            <option value="5+">5+ Years (Senior)</option>
          </select>

          {/* ATS Provider */}
          <select
            value={ats}
            onChange={(e) => {
              setAts(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All ATS Platforms</option>
            <option value="ashby">Ashby</option>
            <option value="greenhouse">Greenhouse</option>
            <option value="lever">Lever</option>
          </select>

          {/* Minimum Salary */}
          <select
            value={minSalary}
            onChange={(e) => {
              setMinSalary(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Salaries</option>
            <option value="1000000">₹10 LPA+ (INR)</option>
            <option value="1500000">₹15 LPA+ (INR)</option>
            <option value="40000">$40k+ USD</option>
            <option value="80000">$80k+ USD</option>
          </select>

          {/* Sorting */}
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="match_score">Highest Match Score</option>
            <option value="newest">Newest Discovered</option>
            <option value="oldest">Oldest Discovered</option>
            <option value="highest_salary">Highest Salary</option>
          </select>
        </div>
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading opportunities...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 space-y-2">
          <Briefcase className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-sm font-medium">No matching jobs found</p>
          <p className="text-xs text-slate-500">Try adjusting your filters or search keywords</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => {
            const skills: string[] = job.extractedSkills ? JSON.parse(job.extractedSkills) : [];
            const isSaved = savedJobIds.has(job.id);

            return (
              <div
                key={job.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Top: Company, ATS badge, and Match Score */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-indigo-400 truncate">
                          {job.companyName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                          {job.atsProvider}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-100 text-base leading-snug line-clamp-2 mt-0.5 group-hover:text-white">
                        {job.jobTitle}
                      </h3>
                    </div>

                    {job.matchScore != null && (
                      <div
                        className={`shrink-0 px-2 py-0.5 rounded-lg font-bold text-xs border ${
                          job.matchScore >= 80
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : job.matchScore >= 60
                            ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {job.matchScore}%
                      </div>
                    )}
                  </div>

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="truncate max-w-[130px]">{job.location || "Remote"}</span>
                    </span>
                    <span className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded-md">
                      <DollarSign className="w-3 h-3 text-emerald-400" />
                      <span>{job.salaryFormatted}</span>
                    </span>
                    <span className="bg-slate-800/80 px-2 py-0.5 rounded-md text-[11px] text-slate-300">
                      {job.experienceClassification}
                    </span>
                  </div>

                  {/* Skills tags */}
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {skills.slice(0, 4).map((skill) => (
                        <span
                          key={skill}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700/50"
                        >
                          {skill}
                        </span>
                      ))}
                      {skills.length > 4 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-400">
                          +{skills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-800/60">
                  <button
                    onClick={() => handleSaveJob(job)}
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

      {/* Pagination Controls */}
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

