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
} from "lucide-react";
import { clearToken, getUser } from "@/api/auth";
import { cn } from "@/lib/utils";
import { ROUTE_ACCESS } from "@/config/accessControl";
import { getPreferredTheme, setTheme } from "@/lib/theme";

// Les roles de chaque lien viennent de ROUTE_ACCESS (accessControl.js) - source unique de
// verite partagee avec RequireRole.jsx, pour que le menu et le blocage reel des routes ne
// puissent jamais diverger.
const NAV_ITEMS = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/registrations", label: "Inscriptions", icon: UserPlus },
  { to: "/users", label: "Comptes utilisateurs", icon: UserCog },
  { to: "/establishments", label: "Etablissements", icon: Building2 },
  { to: "/classes", label: "Classes & matieres", icon: Layers },
  { to: "/payments", label: "Paiements & recettes", icon: Wallet },
  { to: "/grades", label: "Notes & bulletins", icon: GraduationCap },
  { to: "/presence", label: "Presence", icon: ClipboardCheck },
  { to: "/resources", label: "Ressources pedagogiques", icon: BookOpen },
  { to: "/announcements", label: "Annonces", icon: Megaphone },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/status", label: "Statuts & disponibilite", icon: Radio },
  { to: "/child", label: "Suivi de l'enfant", icon: Users },
  { to: "/fees", label: "Paiement des frais", icon: Smartphone },
  { to: "/design-samples", label: "Modeles de Cartes", icon: Palette },
  { to: "/school-ids", label: "Cartes Scolaires", icon: CreditCard },
];

const ROLE_LABELS = {
  ADMINISTRATEUR: "Administrateur",
  DIRECTEUR: "Directeur",
  ENSEIGNANT: "Enseignant",
  PARENT: "Parent",
};

// Navigation principale du tableau de bord (cas d'utilisation Administrateur/Directeur,
// document de conception section 2.1).
export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  const visibleItems = NAV_ITEMS.filter((item) => ROUTE_ACCESS[item.to]?.includes(user?.role));
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

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2.5 px-5 py-6">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="size-4.5" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white leading-tight">SchoolManage</h1>
            <p className="text-xs text-sidebar-foreground/60">Espace {ROLE_LABELS[user?.role] ?? user?.role}</p>
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
              <p className="truncate text-sm font-medium text-white">{user?.email ?? "Utilisateur"}</p>
              <p className="text-xs text-sidebar-foreground/70">{ROLE_LABELS[user?.role] ?? user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"
          >
            <LogOut className="size-4" />
            Se deconnecter
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-8">
          <p className="text-sm text-muted-foreground">
            SchoolManage <span className="mx-1.5 text-border">/</span>
            <span className="text-foreground">{currentItem?.label ?? ""}</span>
          </p>
          <button
            onClick={handleToggleTheme}
            aria-label={theme === "dark" ? "Passer au theme clair" : "Passer au theme sombre"}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/40 p-8">
          <div className="mx-auto max-w-6xl space-y-4">
            {location.state?.accessDenied && (
              <p className="rounded-lg border border-amber-600/30 bg-amber-600/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
                Cette page n'est pas accessible avec votre compte {ROLE_LABELS[user?.role] ?? ""}.
              </p>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
