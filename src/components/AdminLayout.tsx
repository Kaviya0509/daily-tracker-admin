import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "@/services/authService";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import {
  LayoutDashboard,
  Calendar,
  Users,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Activity,
  ChevronRight,
  Bell,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/tracker", label: "Daily Tracker", icon: Calendar, badge: "Live" },
  { path: "/mentees", label: "Manage Mentees", icon: Users, badge: "Roster" },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now] = useState(() => new Date());
  const location = useLocation();
  const navigate = useNavigate();
  const { userProfile, user } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const isActive = (path: string) => {
    if (path === "/tracker") {
      return location.pathname.startsWith("/tracker") || location.pathname.startsWith("/reports");
    }
    if (path === "/mentees") {
      return location.pathname.startsWith("/mentees");
    }
    return location.pathname === path;
  };

  const displayName = userProfile?.displayName || user?.displayName || "Vishwa";
  const email = userProfile?.email || user?.email || "vishwa@gmail.com";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "V";

  const getPageTitle = () => {
    if (location.pathname.startsWith("/dashboard")) return "Dashboard Overview";
    if (location.pathname.startsWith("/reports")) return "Report Details";
    if (location.pathname.startsWith("/tracker")) return "Daily Tracker";
    if (location.pathname.startsWith("/mentees")) return "Manage Mentees";
    return "Dashboard Overview";
  };

  return (
    <div className="min-h-screen flex bg-[#F6F7FE] text-[#25344A] font-sans antialiased">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 inset-y-0 left-0 z-50 w-64 lg:w-72 h-screen bg-[#E8EAFB] text-[#25344A] flex flex-col border-r border-[#D9DDF3] shadow-lg lg:shadow-none transition-transform duration-200 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#D9DDF3] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-to-tr from-[#4F46E5] to-[#4338CA] p-0.5 shadow-md shadow-indigo-500/20 flex items-center justify-center">
              <div className="h-full w-full bg-slate-950/10 backdrop-blur-xs rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-[#25344A]">Admin</span>
              </div>
              <p className="text-xs text-[#66758A] font-normal">Daily Status Tracker</p>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[#66758A] hover:text-[#25344A] hover:bg-[#EEF0FD] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="px-3.5 py-5 flex-1 overflow-y-auto space-y-6">
          <div>
            <div className="px-3 pb-2.5 text-[11px] font-bold tracking-wider text-[#66758A] uppercase">
              MANAGEMENT
            </div>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      active
                        ? "bg-[#FFFFFF] text-[#4F46E5] border border-[#D9DDF3] shadow-xs"
                        : "text-[#25344A] hover:text-[#25344A] hover:bg-[#EEF0FD]"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#4F46E5] rounded-r-full" />
                    )}
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-4.5 w-4.5 transition-colors ${
                          active ? "text-[#4F46E5]" : "text-[#66758A] group-hover:text-[#25344A]"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold transition-colors ${
                          item.badge === "Live"
                            ? "bg-[#4F46E5]/15 text-[#4F46E5] border border-[#4F46E5]/30"
                            : "bg-[#EEF0FD] text-[#66758A] border border-[#D9DDF3]"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Quick Info Box */}
          <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#D9DDF3] text-xs">
            <div className="flex items-center gap-2 text-[#248568] font-semibold mb-1">
              <div className="p-1 rounded-full bg-[#248568]/15 text-[#248568] flex items-center justify-center">
                <Activity className="h-3.5 w-3.5" />
              </div>
              <span className="text-[#25344A] text-xs font-bold">Real-time Workspace</span>
            </div>
            <p className="text-[#66758A] text-[11px] leading-relaxed pl-0.5">
              Statuses update dynamically as mentees log their daily activities.
            </p>
          </div>
        </div>

        {/* User Card & Sign Out */}
        <div className="p-4 border-t border-[#D9DDF3] space-y-2 bg-[#E8EAFB]">
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#FFFFFF] border border-[#D9DDF3]">
            <div className="h-9 w-9 rounded-full bg-[#4F46E5] flex items-center justify-center font-bold text-sm text-white shadow-2xs shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-[#25344A] truncate">{displayName}</p>
                <span className="h-2 w-2 rounded-full bg-[#248568] shrink-0" title="Online" />
              </div>
              <p className="text-[11px] text-[#66758A] truncate">{email}</p>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#66758A] hover:text-[#C84B50] hover:bg-[#EEF0FD] rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navbar Header */}
        <header className="sticky top-0 z-30 bg-[#F6F7FE]/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-3 sm:gap-4 border-b border-[#D9DDF3]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#25344A] hover:bg-[#EEF0FD] transition-colors shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb & Title */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium truncate">
              <span className="text-[#66758A] hidden xs:inline">Admin</span>
              <ChevronRight className="h-3.5 w-3.5 text-[#66758A] shrink-0 hidden xs:inline" />
              <span className="text-[#4F46E5] font-bold truncate">{getPageTitle()}</span>
            </div>
          </div>

          {/* Right Top Header Info */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Live indicator badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#248568]/15 border border-[#248568]/30 text-xs font-semibold text-[#248568]">
              <span className="h-2 w-2 rounded-full bg-[#248568] inline-block shrink-0" />
              <span>Live Synced</span>
            </div>

            {/* Current Date Badge */}
            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#D9DDF3] text-xs font-medium text-[#25344A] shadow-2xs whitespace-nowrap">
              <Calendar className="h-3.5 w-3.5 text-[#66758A] shrink-0" />
              <span className="hidden md:inline">{format(now, "EEE, MMM d, yyyy")}</span>
              <span className="md:hidden">{format(now, "MMM d, yyyy")}</span>
            </div>

            {/* Notification Bell */}
            <button
              className="p-2 rounded-xl bg-[#FFFFFF] border border-[#D9DDF3] text-[#66758A] hover:text-[#25344A] hover:bg-[#EEF0FD] relative shadow-2xs transition-colors cursor-pointer shrink-0"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#C84B50] border border-[#FFFFFF]" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-3.5 sm:px-6 lg:px-8 pb-10 max-w-350 w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
