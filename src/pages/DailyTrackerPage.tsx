import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { format, startOfWeek, endOfWeek, parseISO, subDays } from "date-fns";
import { getAllReports, getActiveMentees } from "@/services/reportService";
import { getReportsForExport } from "@/services/reportService";
import { exportToExcel, generateExportFilename } from "@/services/excelExportService";
import type { MenteeReport, ReportFilters, ReportStatus, UserProfile } from "@/types";
import type { DocumentSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  RotateCcw,
  Eye,
  Pencil,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Loader2,
  Calendar,
  AlertTriangle,
  X,
  Filter,
  FileSpreadsheet,
  Download,
} from "lucide-react";

const statusOptions: ReportStatus[] = [
  "Not Started",
  "In Progress",
  "Blocked",
  "Completed",
  "On Hold",
];

function getMenteeAvatarColor(name: string): string {
  const colors = [
    "bg-blue-600 text-white",
    "bg-emerald-600 text-white",
    "bg-purple-600 text-white",
    "bg-indigo-600 text-white",
    "bg-rose-600 text-white",
    "bg-violet-600 text-white",
    "bg-indigo-600 text-white",
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function renderStatusBadge(status: ReportStatus) {
  switch (status) {
    case "Completed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          Completed
        </span>
      );
    case "In Progress":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
          In Progress
        </span>
      );
    case "Blocked":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
          Blocked
        </span>
      );
    case "On Hold":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
          On Hold
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
          {status}
        </span>
      );
  }
}

function truncate(text: string, maxLength: number = 45): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

function getWeekHeading(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    return `Week of ${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  } catch {
    return "";
  }
}

export default function DailyTrackerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [reports, setReports] = useState<MenteeReport[]>([]);
  const [mentees, setMentees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [lastDocument, setLastDocument] = useState<DocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [previewReport, setPreviewReport] = useState<MenteeReport | null>(null);

  const [sorting, setSorting] = useState<SortingState>([
    { id: "reportDate", desc: true },
  ]);
  const [pageSize, setPageSize] = useState(25);

  const [filters, setFilters] = useState<ReportFilters>({
    search: searchParams.get("search") ?? "",
    startDate: searchParams.get("startDate") ?? "",
    endDate: searchParams.get("endDate") ?? "",
    menteeUid: searchParams.get("menteeUid") ?? "",
    status: (searchParams.get("status") as ReportStatus | "") ?? "",
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");

  // Load active mentees for dropdown
  useEffect(() => {
    const loadMentees = async () => {
      try {
        const activeMentees = await getActiveMentees();
        setMentees(activeMentees);
      } catch (err) {
        console.error("Error loading mentees:", err);
      }
    };
    loadMentees();
  }, []);

  const fetchReports = useCallback(
    async (isLoadMore = false) => {
      try {
        setLoading(true);
        const result = await getAllReports(
          filters,
          pageSize,
          isLoadMore ? lastDocument ?? undefined : undefined
        );

        if (isLoadMore) {
          setReports((prev) => [...prev, ...result.reports]);
        } else {
          setReports(result.reports);
        }

        setLastDocument(result.lastDocument);
        setHasMore(result.total === pageSize);
      } catch (err) {
        console.error("Error fetching reports:", err);
      } finally {
        setLoading(false);
      }
    },
    [filters, pageSize, lastDocument]
  );

  // Sync URL query params with state
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (filters.search) newParams.set("search", filters.search);
    if (filters.startDate) newParams.set("startDate", filters.startDate);
    if (filters.endDate) newParams.set("endDate", filters.endDate);
    if (filters.menteeUid) newParams.set("menteeUid", filters.menteeUid);
    if (filters.status) newParams.set("status", filters.status);
    setSearchParams(newParams, { replace: true });
  }, [filters, setSearchParams]);

  // Fetch reports when filters change
  useEffect(() => {
    setLastDocument(null);
    fetchReports(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.startDate, filters.endDate, filters.menteeUid, filters.status, filters.search, pageSize]);

  const handleResetFilters = () => {
    setFilters({
      search: "",
      startDate: "",
      endDate: "",
      menteeUid: "",
      status: "",
    });
  };

  const setPresetToday = () => {
    setFilters((f) => ({ ...f, startDate: todayStr, endDate: todayStr, status: "" }));
  };

  const handleExport = async (exportType: string) => {
    setExporting(true);
    try {
      let exportFilters = { ...filters };

      if (exportType === "today") {
        exportFilters = { search: "", startDate: todayStr, endDate: todayStr, menteeUid: "", status: "" };
      } else if (exportType === "all") {
        exportFilters = { search: "", startDate: "", endDate: "", menteeUid: "", status: "" };
      }

      const allReports = await getReportsForExport(exportFilters);
      const filename = generateExportFilename(exportFilters);
      exportToExcel(allReports, filename);
    } catch (err) {
      console.error("Error exporting:", err);
    } finally {
      setExporting(false);
    }
  };

  // Group reports by week
  const weekGroups = useMemo(() => {
    const groups: Record<string, MenteeReport[]> = {};
    for (const report of reports) {
      const weekKey = getWeekHeading(report.reportDate);
      if (!groups[weekKey]) {
        groups[weekKey] = [];
      }
      groups[weekKey].push(report);
    }
    return groups;
  }, [reports]);

  const columns: ColumnDef<MenteeReport, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "reportDate",
        header: "Date",
        cell: (info) => (
          <div className="font-semibold text-xs text-slate-800 whitespace-nowrap">
            {(info.row.original as MenteeReport).reportDate}
          </div>
        ),
        size: 105,
      },
      {
        accessorKey: "menteeName",
        header: "Mentee",
        cell: (info) => {
          const report = info.row.original as MenteeReport;
          const initials = report.menteeName
            ? report.menteeName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "M";
          return (
            <div className="flex items-center gap-2.5">
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs ${getMenteeAvatarColor(
                  report.menteeName
                )}`}
              >
                {initials}
              </div>
              <span className="text-sm font-semibold text-slate-900 truncate">
                {report.menteeName}
              </span>
            </div>
          );
        },
        size: 170,
      },
      {
        accessorKey: "currentTask",
        header: "Current Task",
        cell: (info) => {
          const report = info.row.original as MenteeReport;
          return (
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-900 block" title={report.currentTask}>
                {truncate(report.currentTask, 38)}
              </span>
              <span className="text-[11px] text-slate-500 block truncate" title={report.shortDescription}>
                {truncate(report.shortDescription, 45)}
              </span>
            </div>
          );
        },
        size: 220,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => {
          const report = info.row.original as MenteeReport;
          return renderStatusBadge(report.status);
        },
        size: 125,
      },
      {
        accessorKey: "blockerDependency",
        header: "Blocker / Dependency",
        cell: (info) => {
          const report = info.row.original as MenteeReport;
          const hasBlocker = report.blockerDependency && report.blockerDependency.trim().length > 0;
          return (
            <div className="flex items-center gap-1.5">
              {hasBlocker && (
                <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
              )}
              <span
                className={`text-xs ${hasBlocker ? "font-medium text-rose-700" : "text-slate-400"}`}
                title={report.blockerDependency}
              >
                {hasBlocker ? truncate(report.blockerDependency, 35) : "—"}
              </span>
            </div>
          );
        },
        size: 180,
      },
      {
        accessorKey: "managerLead",
        header: "Lead",
        cell: (info) => (
          <span className="text-xs font-medium text-slate-600">
            {(info.row.original as MenteeReport).managerLead || "—"}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: "expectedCompletion",
        header: "Target Date",
        cell: (info) => {
          const val = (info.row.original as MenteeReport).expectedCompletion;
          return (
            <span className="text-xs text-slate-600 whitespace-nowrap">
              {val || "—"}
            </span>
          );
        },
        size: 110,
      },
      {
        id: "actions",
        header: "Actions",
        cell: (info) => {
          const report = info.row.original as MenteeReport;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewReport(report);
                }}
                title="Quick View"
              >
                <Eye className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/reports/${report.reportId}?edit=true`);
                }}
                title="Edit Report"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        },
        size: 90,
      },
    ],
    [navigate]
  );

  const table = useReactTable({
    data: reports,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const selectedMenteeName = useMemo(() => {
    if (!filters.menteeUid) return "";
    const m = mentees.find((user) => user.uid === filters.menteeUid);
    if (m?.displayName) return m.displayName;
    if (m?.email) return m.email;
    const rep = reports.find((r) => r.menteeUid === filters.menteeUid);
    if (rep?.menteeName) return rep.menteeName;
    if (rep?.menteeEmail) return rep.menteeEmail;
    return "Selected Mentee";
  }, [mentees, reports, filters.menteeUid]);

  const isAnyFilterActive = Boolean(
    filters.search || filters.startDate || filters.endDate || filters.menteeUid || filters.status
  );

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#25344A] tracking-tight flex items-center gap-2">
            Daily Status Tracker
          </h1>
          <p className="text-xs sm:text-sm text-[#66758A] mt-0.5">
            Real-time multi-mentee submission feed with granular filters and audit trails
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 1-Click Excel Export for current filters (Start & End Date, Mentee, Status) */}
          <Button
            onClick={() => handleExport("filtered")}
            disabled={exporting}
            className="inline-flex items-center justify-center rounded-xl text-xs font-bold h-9 px-4 bg-[#4F46E5] hover:bg-[#4338CA] text-white shadow-xs transition-colors cursor-pointer"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            )}
            Export Excel
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={exporting}
              className="inline-flex items-center justify-center rounded-xl text-xs font-semibold h-9 px-2 border border-[#D9DDF3] text-[#25344A] bg-[#FFFFFF] hover:bg-[#EEF0FD] shadow-xs transition-colors cursor-pointer"
              title="More export options"
            >
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" sideOffset={6} className="w-52 bg-[#FFFFFF] border border-[#D9DDF3] text-[#25344A]">
              <DropdownMenuItem onClick={() => handleExport("filtered")} className="text-xs hover:bg-[#EEF0FD] cursor-pointer">
                <Filter className="h-4 w-4 mr-2 text-[#4F46E5]" />
                Export Current Filters
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("today")} className="text-xs hover:bg-[#EEF0FD] cursor-pointer">
                <Calendar className="h-4 w-4 mr-2 text-[#66758A]" />
                Export Today's ({todayStr})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("all")} className="text-xs hover:bg-[#EEF0FD] cursor-pointer">
                <Download className="h-4 w-4 mr-2 text-[#66758A]" />
                Export All History
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Preset Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <span className="text-xs font-semibold text-[#66758A] uppercase tracking-wider mr-1">
          Quick Views:
        </span>
        <button
          onClick={handleResetFilters}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
            !isAnyFilterActive
              ? "bg-[#25344A] text-white shadow-xs"
              : "bg-[#FFFFFF] text-[#25344A] border border-[#D9DDF3] hover:bg-[#EEF0FD]"
          }`}
        >
          All Reports
        </button>
        <button
          onClick={setPresetToday}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
            filters.startDate === todayStr && filters.endDate === todayStr
              ? "bg-[#4F46E5] text-white shadow-xs"
              : "bg-[#FFFFFF] text-[#25344A] border border-[#D9DDF3] hover:bg-[#EEF0FD] hover:text-[#4F46E5]"
          }`}
        >
          <Calendar className="h-3 w-3" />
          Today's Reports
        </button>
      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9DDF3] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-3.5">
          {/* Search Input - 4 cols */}
          <div className="lg:col-span-4 relative">
            <label className="text-[11px] font-semibold text-[#66758A] uppercase tracking-wider mb-1 block">
              Search Content
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#66758A] pointer-events-none" />
              <Input
                placeholder="Search by mentee name, task, description..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="pl-9 pr-8 h-9 text-xs rounded-xl border-[#D9DDF3] bg-[#EEF0FD] placeholder:text-[#66758A]/70"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters((f) => ({ ...f, search: "" }))}
                  className="absolute right-2.5 top-2.5 text-[#66758A] hover:text-[#25344A]"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Mentee Select - 2 cols */}
          <div className="lg:col-span-2">
            <label className="text-[11px] font-semibold text-[#66758A] uppercase tracking-wider mb-1 block">
              Mentee
            </label>
            <Select
              value={filters.menteeUid || "all"}
              onValueChange={(val: string | null) =>
                setFilters((f) => ({
                  ...f,
                  menteeUid: !val || val === "all" ? "" : val,
                }))
              }
            >
              <SelectTrigger className="h-9 w-full text-xs rounded-xl border-[#D9DDF3] bg-[#EEF0FD] text-[#25344A]">
                <span className="truncate flex-1 text-left font-medium text-xs">
                  {filters.menteeUid ? (selectedMenteeName || "Selected Mentee") : "All Mentees"}
                </span>
              </SelectTrigger>
              <SelectContent align="start" side="bottom" className="bg-[#FFFFFF] border border-[#D9DDF3]">
                <SelectItem value="all">All Mentees ({mentees.length})</SelectItem>
                {mentees.map((m) => (
                  <SelectItem key={m.uid} value={m.uid}>
                    {m.displayName || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Select - 2 cols */}
          <div className="lg:col-span-2">
            <label className="text-[11px] font-semibold text-[#66758A] uppercase tracking-wider mb-1 block">
              Status
            </label>
            <Select
              value={filters.status || "all"}
              onValueChange={(val: string | null) =>
                setFilters((f) => ({
                  ...f,
                  status: !val || val === "all" ? "" : (val as ReportStatus),
                }))
              }
            >
              <SelectTrigger className="h-9 w-full text-xs rounded-xl border-[#D9DDF3] bg-[#EEF0FD] text-[#25344A]">
                <span className="truncate flex-1 text-left font-medium text-xs">
                  {filters.status ? filters.status : "All Statuses"}
                </span>
              </SelectTrigger>
              <SelectContent align="start" side="bottom" className="bg-[#FFFFFF] border border-[#D9DDF3]">
                <SelectItem value="all">All Statuses</SelectItem>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start Date - 2 cols */}
          <div className="lg:col-span-2">
            <label className="text-[11px] font-semibold text-[#66758A] uppercase tracking-wider mb-1 block">
              Start Date
            </label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
              className="h-9 w-full text-xs rounded-xl border-[#D9DDF3] bg-[#EEF0FD] text-[#25344A]"
            />
          </div>

          {/* End Date - 2 cols */}
          <div className="lg:col-span-2">
            <label className="text-[11px] font-semibold text-[#66758A] uppercase tracking-wider mb-1 block">
              End Date
            </label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
              className="h-9 w-full text-xs rounded-xl border-[#D9DDF3] bg-[#EEF0FD] text-[#25344A]"
            />
          </div>
        </div>

        {/* Second row of date & reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#D9DDF3]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#66758A] font-medium">Date Presets:</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5 rounded-lg border-[#D9DDF3] bg-[#EEF0FD] text-[#25344A] hover:bg-[#E8EAFB]"
              onClick={() => setFilters((f) => ({ ...f, startDate: todayStr, endDate: todayStr }))}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5 rounded-lg border-[#D9DDF3] bg-[#EEF0FD] text-[#25344A] hover:bg-[#E8EAFB]"
              onClick={() => setFilters((f) => ({ ...f, startDate: yesterdayStr, endDate: yesterdayStr }))}
            >
              Yesterday
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-2.5 rounded-lg border-[#D9DDF3] bg-[#EEF0FD] text-[#25344A] hover:bg-[#E8EAFB]"
              onClick={() => setFilters((f) => ({ ...f, startDate: "", endDate: "" }))}
            >
              Clear Dates
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#25344A] bg-[#EEF0FD] border border-[#D9DDF3] px-2.5 py-1 rounded-full">
              {reports.length} report{reports.length !== 1 ? "s" : ""} loaded
            </span>
            {isAnyFilterActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 text-xs text-[#66758A] hover:text-[#25344A] cursor-pointer"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset All Filters
              </Button>
            )}
          </div>
        </div>

        {/* Active Filter Chips */}
        {isAnyFilterActive && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#D9DDF3] text-xs">
            <span className="text-[#66758A] font-medium mr-1">Active:</span>
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EEF0FD] text-[#25344A] border border-[#D9DDF3] font-medium">
                Search: "{filters.search}"
                <X
                  className="h-3 w-3 cursor-pointer hover:text-rose-500"
                  onClick={() => setFilters((f) => ({ ...f, search: "" }))}
                />
              </span>
            )}
            {filters.status && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium border border-indigo-200">
                Status: {filters.status}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-rose-500"
                  onClick={() => setFilters((f) => ({ ...f, status: "" }))}
                />
              </span>
            )}
            {selectedMenteeName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                Mentee: {selectedMenteeName}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-rose-500"
                  onClick={() => setFilters((f) => ({ ...f, menteeUid: "" }))}
                />
              </span>
            )}
            {filters.startDate && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EEF0FD] text-[#25344A] border border-[#D9DDF3] font-medium">
                From: {filters.startDate}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-rose-500"
                  onClick={() => setFilters((f) => ({ ...f, startDate: "" }))}
                />
              </span>
            )}
            {filters.endDate && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EEF0FD] text-[#25344A] border border-[#D9DDF3] font-medium">
                To: {filters.endDate}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-rose-500"
                  onClick={() => setFilters((f) => ({ ...f, endDate: "" }))}
                />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Modern Data Table */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-[#D9DDF3] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-[#EEF0FD] hover:bg-[#EEF0FD] border-b border-[#D9DDF3]"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-[#66758A] text-[11px] font-bold uppercase tracking-wider py-3.5 px-3.5 whitespace-nowrap"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : (
                        <div
                          className={`flex items-center gap-1.5 ${
                            header.column.getCanSort()
                              ? "cursor-pointer select-none hover:text-[#4F46E5] transition-colors"
                              : ""
                          }`}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() &&
                            (header.column.getIsSorted() === "asc" ? (
                              <ChevronUp className="h-3.5 w-3.5 text-[#4F46E5]" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ChevronDown className="h-3.5 w-3.5 text-[#4F46E5]" />
                            ) : (
                              <ChevronsUpDown className="h-3 w-3 text-[#66758A]" />
                            ))}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((_, j) => (
                      <TableCell key={j} className="py-3 px-3.5">
                        <Skeleton className="h-4 w-full rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-16">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-[#4F46E5] mx-auto flex items-center justify-center">
                        <Search className="h-6 w-6" />
                      </div>
                      <h4 className="text-base font-bold text-[#25344A]">
                        No Reports Matching Criteria
                      </h4>
                      <p className="text-xs text-[#66758A]">
                        Try modifying your date window, status selection, or clearing search keywords.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetFilters}
                        className="rounded-xl border-[#D9DDF3] text-[#25344A] bg-[#FFFFFF] hover:bg-[#EEF0FD]"
                      >
                        Reset All Filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(weekGroups).map(([weekHeading, weekReports]) => {
                  const showWeekHeading = !filters.startDate || filters.startDate !== filters.endDate;
                  return (
                    <Fragment key={weekHeading}>
                      {showWeekHeading && (
                        <TableRow className="bg-[#EEF0FD] hover:bg-[#EEF0FD] border-y border-[#D9DDF3]">
                          <TableCell
                            colSpan={columns.length}
                            className="py-2.5 px-4 text-xs font-bold text-[#25344A]"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-[#4F46E5]" />
                                <span>{weekHeading}</span>
                              </div>
                              <span className="text-[11px] font-medium text-[#25344A] bg-[#FFFFFF] border border-[#D9DDF3] px-2.5 py-0.5 rounded-full">
                                {weekReports.length} {weekReports.length === 1 ? "report" : "reports"}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      {weekReports.map((report, rowIndex) => (
                        <TableRow
                          key={report.reportId}
                          className={`cursor-pointer transition-colors hover:bg-[#EEF0FD]/70 border-b border-[#D9DDF3]/70 ${
                            rowIndex % 2 === 0 ? "bg-[#FFFFFF]" : "bg-[#EEF0FD]/30"
                          }`}
                          onClick={() => setPreviewReport(report)}
                        >
                          <TableCell className="py-3 px-3.5">
                            <span className="text-xs font-semibold text-[#25344A] whitespace-nowrap">
                              {report.reportDate}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-3.5">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 shadow-xs ${getMenteeAvatarColor(
                                  report.menteeName
                                )}`}
                              >
                                {report.menteeName
                                  ? report.menteeName
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()
                                  : "M"}
                              </div>
                              <span className="text-xs font-bold text-[#25344A] truncate">
                                {report.menteeName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-3.5">
                            <div className="space-y-0.5">
                              <span
                                className="text-xs font-semibold text-[#25344A] block"
                                title={report.currentTask}
                              >
                                {truncate(report.currentTask, 38)}
                              </span>
                              <span
                                className="text-[11px] text-[#66758A] block truncate"
                                title={report.shortDescription}
                              >
                                {truncate(report.shortDescription, 45)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-3.5">
                            {renderStatusBadge(report.status)}
                          </TableCell>
                          <TableCell className="py-3 px-3.5">
                            <div className="flex items-center gap-1.5">
                              {report.blockerDependency && report.blockerDependency.trim().length > 0 && (
                                <AlertTriangle className="h-3.5 w-3.5 text-[#C84B50] shrink-0" />
                              )}
                              <span
                                className={`text-xs ${
                                  report.blockerDependency && report.blockerDependency.trim().length > 0
                                    ? "font-medium text-[#C84B50]"
                                    : "text-[#66758A]"
                                }`}
                                title={report.blockerDependency}
                              >
                                {report.blockerDependency && report.blockerDependency.trim().length > 0
                                  ? truncate(report.blockerDependency, 35)
                                  : "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-3.5">
                            <span className="text-xs font-medium text-[#25344A]">
                              {report.managerLead || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-3.5">
                            <span className="text-xs text-[#25344A] whitespace-nowrap">
                              {report.expectedCompletion || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-[#66758A] hover:text-[#4F46E5] hover:bg-[#EEF0FD]"
                                onClick={() => setPreviewReport(report)}
                                title="Quick View"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-[#66758A] hover:text-[#4779C7] hover:bg-[#EEF0FD]"
                                onClick={() => navigate(`/reports/${report.reportId}?edit=true`)}
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        {reports.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 border-t border-[#D9DDF3] bg-[#EEF0FD]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#66758A] font-medium">Rows per page:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val: string | null) => {
                  if (val) setPageSize(Number(val));
                }}
              >
                <SelectTrigger className="h-8 w-20 text-xs rounded-lg border-[#D9DDF3] bg-[#FFFFFF] text-[#25344A]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#FFFFFF] border border-[#D9DDF3]">
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#66758A] font-medium">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-8 text-xs rounded-lg border-[#D9DDF3] bg-[#FFFFFF] text-[#25344A] hover:bg-[#E8EAFB]"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-8 text-xs rounded-lg border-[#D9DDF3] bg-[#FFFFFF] text-[#25344A] hover:bg-[#E8EAFB]"
              >
                Next
              </Button>
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchReports(true)}
                  className="h-8 text-xs rounded-lg border-[#4F46E5] text-[#4F46E5] bg-[#FFFFFF] hover:bg-[#EEF0FD] font-semibold"
                  disabled={loading}
                >
                  Load More From Cloud
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick View Modal Dialog - max-w-2xl, no raw ID */}
      <Dialog open={!!previewReport} onOpenChange={(open: boolean) => !open && setPreviewReport(null)}>
        {previewReport && (
          <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-2xl p-0 max-h-[92vh] overflow-y-auto rounded-3xl bg-[#FFFFFF] border border-[#D9DDF3] shadow-2xl">
            <DialogHeader className="p-5 bg-linear-to-r from-[#4F46E5] to-[#4338CA] text-white relative text-left">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${getMenteeAvatarColor(
                      previewReport.menteeName
                    )}`}
                  >
                    {previewReport.menteeName
                      ? previewReport.menteeName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      : "M"}
                  </div>
                  <div>
                    <DialogTitle className="text-base font-bold text-white">
                      {previewReport.menteeName}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-indigo-100">
                      Report Date: {previewReport.reportDate}
                    </DialogDescription>
                  </div>
                </div>
                {renderStatusBadge(previewReport.status)}
              </div>
            </DialogHeader>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-sans bg-[#FFFFFF]">
              {/* Task Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                  Task / Project Title
                </label>
                <p className="text-sm font-bold text-[#25344A] bg-[#EEF0FD] p-3 rounded-xl border border-[#D9DDF3]">
                  {previewReport.currentTask}
                </p>
              </div>

              {/* Work Description */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                  Work Description
                </label>
                <p className="text-xs text-[#25344A] bg-[#EEF0FD] p-3 rounded-xl border border-[#D9DDF3] whitespace-pre-wrap leading-relaxed">
                  {previewReport.shortDescription || "No detailed description provided."}
                </p>
              </div>

              {/* Blockers */}
              {previewReport.blockerDependency && previewReport.blockerDependency !== "None" ? (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#C84B50] uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Blocker / Dependency Details
                  </label>
                  <p className="text-xs text-[#C84B50] bg-[#C84B50]/10 p-3 rounded-xl border border-[#C84B50]/30 whitespace-pre-wrap leading-relaxed font-medium">
                    {previewReport.blockerDependency}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                    Blocker / Dependency Details
                  </label>
                  <p className="text-xs text-[#66758A] italic bg-[#EEF0FD] p-3 rounded-xl border border-[#D9DDF3]">
                    No blockers reported.
                  </p>
                </div>
              )}

              {/* Idle Reason */}
              {previewReport.idleReasonWorkNeeded && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#25344A] uppercase tracking-wider">
                    Idle Reason / Support Needed
                  </label>
                  <p className="text-xs text-[#25344A] bg-[#EEF0FD] p-3 rounded-xl border border-[#D9DDF3] whitespace-pre-wrap leading-relaxed">
                    {previewReport.idleReasonWorkNeeded}
                  </p>
                </div>
              )}

              {/* Lead and Target Date */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-[#EEF0FD] border border-[#D9DDF3] space-y-0.5">
                  <span className="text-[10px] font-semibold text-[#66758A] uppercase">
                    Reporting Lead
                  </span>
                  <p className="text-xs font-bold text-[#25344A]">
                    {previewReport.managerLead || "None specified"}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#EEF0FD] border border-[#D9DDF3] space-y-0.5">
                  <span className="text-[10px] font-semibold text-[#66758A] uppercase">
                    Target Completion
                  </span>
                  <p className="text-xs font-bold text-[#25344A]">
                    {previewReport.expectedCompletion || "No date set"}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {previewReport.notes && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#66758A] uppercase tracking-wider">
                    Additional Notes
                  </label>
                  <p className="text-xs text-[#25344A] bg-[#EEF0FD] p-3 rounded-xl border border-[#D9DDF3] whitespace-pre-wrap">
                    {previewReport.notes}
                  </p>
                </div>
              )}

              {/* Mentee info footer without raw ID */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#66758A] pt-3 border-t border-[#D9DDF3]">
                <span>
                  Mentee: {previewReport.menteeName || "Mentee"} {previewReport.menteeEmail ? `(${previewReport.menteeEmail})` : ""}
                </span>
              </div>
            </div>

            <div className="p-4 bg-[#E8EAFB] border-t border-[#D9DDF3] flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewReport(null)}
                className="rounded-xl text-xs border-[#D9DDF3] bg-[#FFFFFF] text-[#25344A] hover:bg-[#EEF0FD] cursor-pointer"
              >
                Close Preview
              </Button>
              <Button
                size="sm"
                className="bg-linear-to-r from-[#4F46E5] to-[#4338CA] hover:from-[#4338CA] hover:to-[#3730A3] text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
                onClick={() => {
                  const id = previewReport.reportId;
                  setPreviewReport(null);
                  navigate(`/reports/${id}?edit=true`);
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit Full Report
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
