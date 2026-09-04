import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Wallet,
  Megaphone,
  LogOut,
  GraduationCap,
  ClipboardCheck,
  BookOpen,
  Users,
  UserPlus,
  UserCog,
  Bell,
  Smartphone,
  Layers,
  Radio,
  Sun,
  Moon,
  Palette,
  CreditCard,
  CalendarDays,
} from "lucide-react";
import { clearToken, getUser } from "@/api/auth";
import { cn } from "@/lib/utils";
import { ROUTE_ACCESS } from "@/config/accessControl";
import { getPreferredTheme, setTheme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { Languages } from "lucide-react";

const NAV_ITEMS = [
  { to: "/", key: "nav.dashboard", icon: LayoutDashboard },
  { to: "/registrations", key: "nav.registrations", icon: UserPlus },
  { to: "/users", key: "nav.users", icon: UserCog },
  { to: "/establishments", key: "nav.establishments", icon: Building2 },
  { to: "/classes", key: "nav.classes", icon: Layers },
  { to: "/payments", key: "nav.payments", icon: Wallet },
  { to: "/grades", key: "nav.grades", icon: GraduationCap },
  { to: "/presence", key: "nav.presence", icon: ClipboardCheck },
  { to: "/resources", key: "nav.resources", icon: BookOpen },
  { to: "/announcements", key: "nav.announcements", icon: Megaphone },
  { to: "/notifications", key: "nav.notifications", icon: Bell },
  { to: "/status", key: "nav.status", icon: Radio },
  { to: "/child", key: "nav.child", icon: Users },
  { to: "/fees", key: "nav.fees", icon: Smartphone },
  { to: "/design-samples", key: "nav.designSamples", icon: Palette },
  { to: "/school-ids", key: "nav.schoolIds", icon: CreditCard },
  { to: "/timetable", key: "nav.timetable", icon: CalendarDays },
];

const ROLE_LABELS = {
  ADMINISTRATEUR: "role.ADMINISTRATEUR",
  DIRECTEUR: "role.DIRECTEUR",
  ENSEIGNANT: "role.ENSEIGNANT",
  PARENT: "role.PARENT",
};

export default function Layout() {
  const { t, lang, setLang } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const visibleItems = NAV_ITEMS.filter((item) => ROUTE_ACCESS[item.to]?.includes(user?.role)).map(i=> ({...i, label: t(i.key)}));
  const currentItem = visibleItems.find((item) => item.to === location.pathname);
  const initial = (user?.email || "?").charAt(0).toUpperCase();
  const [theme, setThemeState] = useState(getPreferredTheme);

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  function handleToggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }
  function handleToggleLang() {
    setLang(lang === "en" ? "fr" : "en");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2.5 px-5 py-6">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="size-4.5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white leading-tight">SchoolManage</h1>
            <p className="text-xs text-sidebar-foreground/60">{t("space")} {t(ROLE_LABELS[user?.role] ?? user?.role)}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {visibleItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-white shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-3 py-4">
          <div className="mb-2 flex items-center gap-2.5 px-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-medium text-white">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{user?.email ?? t("common.user")}</p>
              <p className="text-xs text-sidebar-foreground/70">{t(ROLE_LABELS[user?.role] ?? user?.role)}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white">
            <LogOut className="size-4" /> {t("logout")}
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-8">
          <p className="text-sm text-muted-foreground">
            SchoolManage <span className="mx-1.5 text-border">/</span>
            <span className="text-foreground">{currentItem?.label ?? ""}</span>
          </p>
          <div className="flex items-center gap-1">
            <button onClick={handleToggleLang} aria-label={t("lang.toggle")} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <Languages className="size-4" /> {lang === "en" ? "FR" : "EN"}
            </button>
            <button onClick={handleToggleTheme} aria-label={theme === "dark" ? t("theme.dark") : t("theme.light")} className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/40 p-8">
          <div className="mx-auto max-w-6xl space-y-4">
            {location.state?.accessDenied && (
              <p className="rounded-lg border border-amber-600/30 bg-amber-600/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                {t("accessDenied", { role: t(ROLE_LABELS[user?.role] ?? user?.role) })}
              </p>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
