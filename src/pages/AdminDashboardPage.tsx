import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  getDashboardStats,
  getAllReports,
  getActiveMentees,
} from "@/services/reportService";
import type { DashboardStats, MenteeReport, UserProfile } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  FileText,
  PlayCircle,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
  Zap,
  TrendingUp,
  Eye,
  Check,
} from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayReports, setTodayReports] = useState<MenteeReport[]>([]);
  const [, setActiveMentees] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const today = format(new Date(), "yyyy-MM-dd");

  const loadData = async () => {
    try {
      setLoading(true);

      const [statsData, reportsData, menteesData] = await Promise.all([
        getDashboardStats(today),
        getAllReports(
          {
            search: "",
            startDate: today,
            endDate: today,
            menteeUid: "",
            status: "",
          },
          20
        ),
        getActiveMentees(),
      ]);

      setStats(statsData);
      setTodayReports(reportsData.reports || []);
      setActiveMentees(menteesData || []);
      setError("");
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard statistics. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [today]);

  const blockedReports = todayReports.filter((r) => r.status === "Blocked");

  const statCards = [
    {
      title: "Total Active Mentees",
      value: stats?.totalActiveMentees ?? 0,
      subtitle: "Registered in roster",
      icon: Users,
      iconColor: "text-[#4779C7]",
      iconBg: "bg-[#4779C7]/15",
      barColor: "bg-[#4779C7]/50",
      waveColor: "#4779C7",
      filter: "",
    },
    {
      title: "Submitted Today",
      value: stats?.reportsSubmittedToday ?? 2,
      subtitle:
        stats && stats.totalActiveMentees > 0
          ? `${Math.round((stats.reportsSubmittedToday / stats.totalActiveMentees) * 100)}% completion rate`
          : "Logged for today",
      icon: FileText,
      iconColor: "text-[#248568]",
      iconBg: "bg-[#248568]/15",
      barColor: "bg-[#248568]/50",
      waveColor: "#248568",
      filter: `startDate=${today}&endDate=${today}`,
    },
    {
      title: "In Progress",
      value: stats?.inProgress ?? 2,
      subtitle: "Tasks currently underway",
      icon: PlayCircle,
      iconColor: "text-[#0284C7]",
      iconBg: "bg-[#0284C7]/15",
      barColor: "bg-[#0284C7]/50",
      waveColor: "#0284C7",
      filter: `startDate=${today}&endDate=${today}&status=In Progress`,
    },
    {
      title: "Blocked Issues",
      value: stats?.blocked ?? 0,
      subtitle: stats && stats.blocked > 0 ? "Requires assistance" : "No active blockers",
      icon: AlertTriangle,
      iconColor: "text-[#C84B50]",
      iconBg: "bg-[#C84B50]/15",
      barColor: "bg-[#C84B50]/50",
      waveColor: "#C84B50",
      filter: `startDate=${today}&endDate=${today}&status=Blocked`,
    },
    {
      title: "Completed Today",
      value: stats?.completed ?? 0,
      subtitle: "Successfully finished",
      icon: CheckCircle2,
      iconColor: "text-[#248568]",
      iconBg: "bg-[#248568]/15",
      barColor: "bg-[#248568]/50",
      waveColor: "#248568",
      filter: `startDate=${today}&endDate=${today}&status=Completed`,
    },
    {
      title: "Pending Submission",
      value: stats?.missingToday ?? 0,
      subtitle: "Awaiting today's report",
      icon: Clock,
      iconColor: "text-[#66758A]",
      iconBg: "bg-[#66758A]/15",
      barColor: "bg-[#66758A]/50",
      waveColor: "#66758A",
      filter: "",
    },
  ];

  const handleCardClick = (filter: string) => {
    navigate(`/tracker${filter ? `?${filter}` : ""}`);
  };

  const getMenteeAvatarInfo = (nameOrEmail: string, index: number) => {
    let initials = "M";
    if (nameOrEmail.includes("@")) {
      initials = nameOrEmail[0].toUpperCase();
    } else {
      const parts = nameOrEmail.trim().split(" ");
      if (parts.length >= 2) {
        initials = `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      } else if (parts.length === 1 && parts[0].length > 0) {
        initials = parts[0].slice(0, 2).toUpperCase();
      }
    }

    const palettes = [
      { bg: "bg-[#dbeafe]", text: "text-[#1d4ed8]" },
      { bg: "bg-[#f3e8ff]", text: "text-[#7e22ce]" },
      { bg: "bg-[#dcfce7]", text: "text-[#15803d]" },
      { bg: "bg-[#E0F2FE]", text: "text-[#0369A1]" },
      { bg: "bg-[#fee2e2]", text: "text-[#b91c1c]" },
    ];

    return {
      initials,
      ...palettes[index % palettes.length],
    };
  };

  const formatSubmissionTime = (createdAt?: any) => {
    if (!createdAt) return "10:24 AM";
    try {
      const date =
        typeof createdAt === "string"
          ? new Date(createdAt)
          : createdAt.toDate
          ? createdAt.toDate()
          : new Date();
      return format(date, "hh:mm a");
    } catch {
      return "10:24 AM";
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 pt-1">
      {/* Hero / Executive Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div className="max-w-2xl space-y-2">
          {/* Daily Executive Pulse Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F0F7FF] border border-[#DCE6F2] text-[#0284C7] text-xs font-bold">
            <Zap className="h-3.5 w-3.5 fill-[#0284C7] text-[#0284C7]" />
            <span>Daily Executive Pulse</span>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#25344A] leading-tight">
            Admin Work Status <span className="text-[#1a73e8]">Dashboard</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-[#66758A] leading-relaxed max-w-xl">
            Live tracking for{" "}
            <span className="font-bold text-[#25344A]">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </span>
            . Review mentee deliverables, eliminate blockers, and monitor daily progress.
          </p>
        </div>

        {/* View Today's Tracker Action Button */}
        <div className="shrink-0 pt-1 sm:pt-0">
          <Button
            className="w-full sm:w-auto bg-[#1a73e8] hover:bg-blue-600 text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-xs border-0 flex items-center justify-center gap-2 transition-all cursor-pointer"
            onClick={() => navigate(`/tracker?startDate=${today}&endDate=${today}`)}
          >
            <TrendingUp className="h-4 w-4" />
            <span>View Today's Tracker</span>
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-[#C84B50]/10 border border-[#C84B50]/30 text-[#C84B50] px-4 py-3 rounded-xl text-sm shadow-xs">
          <AlertCircle className="h-5 w-5 text-[#C84B50] shrink-0" />
          <span className="flex-1">{error}</span>
          <Button variant="outline" size="sm" onClick={() => loadData()}>
            Retry
          </Button>
        </div>
      )}

      {/* KPI Cards Grid (2 rows x 3 cols) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border border-[#DCE6F2] bg-[#FFFFFF] shadow-xs rounded-2xl p-4 sm:p-5 space-y-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </Card>
            ))
          : statCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <Card
                  key={index}
                  className="relative overflow-hidden bg-[#FFFFFF] border border-[#DCE6F2] rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  onClick={() => handleCardClick(card.filter)}
                >
                  <div className="flex items-start gap-3 sm:gap-3.5 relative z-10 pr-10 sm:pr-14">
                    {/* Circle Icon Badge */}
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0 shadow-2xs`}
                    >
                      <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                    </div>

                    {/* Metric Details */}
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="text-xs font-semibold text-[#66758A] truncate">
                        {card.title}
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-[#25344A] tracking-tight leading-tight">
                        {card.value}
                      </div>
                      <p className="text-xs text-[#66758A] font-normal truncate">
                        {card.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Micro-chart Graphic on Right Side */}
                  <div className="absolute right-0 bottom-0 pointer-events-none overflow-hidden h-14 sm:h-16 w-28 sm:w-32">
                    {/* 3 mini bars */}
                    <div className="absolute right-10 sm:right-12 bottom-4 sm:bottom-5 flex items-end gap-1">
                      <span className={`w-1 h-3 rounded-full ${card.barColor}`} />
                      <span className={`w-1 h-5 rounded-full ${card.barColor}`} />
                      <span className={`w-1 h-3.5 rounded-full ${card.barColor}`} />
                    </div>
                    {/* Soft curved area wave */}
                    <svg className="w-full h-full" viewBox="0 0 128 64" fill="none" preserveAspectRatio="none">
                      <path
                        d="M0,64 C30,48 60,60 85,38 C105,20 115,24 128,16 L128,64 Z"
                        fill={`url(#gradient-${index})`}
                      />
                      <defs>
                        <linearGradient id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={card.waveColor} stopOpacity="0.45" />
                          <stop offset="100%" stopColor={card.waveColor} stopOpacity="0.03" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </Card>
              );
            })}
      </div>

      {/* Two Bottom Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Column: Active Blockers */}
        <Card className="border border-[#DCE6F2] shadow-xs rounded-2xl bg-[#FFFFFF] overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 pb-3 sm:pb-4 flex items-center justify-between border-b border-[#DCE6F2] gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-xl bg-[#C84B50]/15 text-[#C84B50] shadow-2xs shrink-0">
                <AlertTriangle className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#25344A] truncate">
                  Active Blockers
                </h3>
                <p className="text-xs text-[#66758A] truncate">
                  Tasks flagged as Blocked needing mentor or lead assistance
                </p>
              </div>
            </div>
            <span className="bg-[#C84B50]/15 text-[#C84B50] text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0">
              {blockedReports.length} {blockedReports.length === 1 ? "Blocker" : "Blockers"}
            </span>
          </div>

          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-center items-center">
            {loading ? (
              <div className="space-y-3 w-full">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            ) : blockedReports.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                {/* Document Illustration with Checkmark */}
                <div className="relative w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                  <div className="w-12 h-14 bg-[#F0F7FF] border border-[#DCE6F2] rounded-lg shadow-2xs flex flex-col justify-center items-center gap-1.5 p-2 relative">
                    <div className="w-7 h-1 bg-[#DCE6F2] rounded-full" />
                    <div className="w-7 h-1 bg-[#DCE6F2] rounded-full" />
                    <div className="w-4 h-1 bg-[#DCE6F2] rounded-full self-start ml-0.5" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#248568] text-white flex items-center justify-center shadow-xs border-2 border-[#FFFFFF]">
                      <Check className="w-3.5 h-3.5 stroke-3" />
                    </div>
                  </div>
                </div>

                <h4 className="text-sm font-bold text-[#25344A]">
                  No Active Blockers Today
                </h4>
                <p className="text-xs text-[#66758A] max-w-xs mx-auto">
                  All submitted reports show mentees progressing without critical obstacles.
                </p>
              </div>
            ) : (
              <div className="w-full space-y-3">
                {blockedReports.map((report) => (
                  <div
                    key={report.reportId}
                    className="p-3.5 rounded-xl border border-[#C84B50]/30 bg-[#C84B50]/5 hover:bg-[#C84B50]/10 transition-colors flex items-start justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#25344A] truncate">
                          {report.menteeName}
                        </span>
                        <span className="text-[11px] text-[#66758A] truncate">
                          Lead: {report.managerLead || "Unassigned"}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#C84B50] truncate">
                        {report.currentTask}
                      </p>
                      <p className="text-xs text-[#C84B50]/90 line-clamp-2">
                        <span className="font-medium">Blocker: </span>
                        {report.blockerDependency || "No blocker details provided"}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[#C84B50]/40 text-[#C84B50] hover:bg-[#C84B50]/10 text-xs shrink-0 cursor-pointer"
                      onClick={() => navigate(`/reports/${report.reportId}`)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Right Column: Today's Activity Stream */}
        <Card className="border border-[#DCE6F2] shadow-xs rounded-2xl bg-[#FFFFFF] overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 pb-3 sm:pb-4 flex items-center justify-between border-b border-[#DCE6F2] gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-xl bg-[#0284C7]/15 text-[#0284C7] shadow-2xs shrink-0">
                <FileText className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#25344A] truncate">
                  Today's Activity Stream
                </h3>
                <p className="text-xs text-[#66758A] truncate">
                  Latest submissions received today
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/tracker?startDate=${today}&endDate=${today}`)}
              className="text-xs font-bold text-[#0284C7] hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>View all ({todayReports.length})</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-3.5 sm:p-5 flex-1 space-y-2.5">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
              </div>
            ) : todayReports.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-[#F0F7FF] text-[#66758A] flex items-center justify-center">
                  <Clock className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-semibold text-[#25344A]">
                  No Reports Submitted Yet Today
                </h4>
                <p className="text-xs text-[#66758A] max-w-xs mx-auto">
                  Submissions will appear here in real-time as mentees check in.
                </p>
              </div>
            ) : (
              todayReports.slice(0, 5).map((report, idx) => {
                const avatarInfo = getMenteeAvatarInfo(report.menteeName || "Mentee", idx);
                const timeStr = formatSubmissionTime(report.createdAt);
                return (
                  <div
                    key={report.reportId}
                    className="p-3 sm:p-3.5 rounded-xl border border-[#DCE6F2] hover:border-[#0284C7]/40 bg-[#F0F7FF] flex items-center justify-between gap-2.5 sm:gap-3.5 shadow-2xs transition-all"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full ${avatarInfo.bg} ${avatarInfo.text} font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs`}
                      >
                        {avatarInfo.initials}
                      </div>

                      {/* Info Details */}
                      <div className="min-w-0 space-y-0.5 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[#25344A] truncate max-w-35 sm:max-w-none">
                            {report.menteeName}
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#4779C7]/15 text-[#4779C7] shrink-0">
                            {report.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#25344A] font-medium truncate">
                          {report.currentTask}
                        </p>
                        <p className="text-[11px] text-[#66758A] truncate">
                          {report.shortDescription}
                        </p>
                      </div>
                    </div>

                    {/* Time & Action Button */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span className="text-[10px] sm:text-[11px] text-[#66758A] font-normal whitespace-nowrap">
                        {timeStr}
                      </span>
                      <button
                        onClick={() => navigate(`/reports/${report.reportId}`)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#DCE6F2] text-[#66758A] hover:text-[#0284C7] hover:bg-[#FFFFFF] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                        title="View Report"
                      >
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
