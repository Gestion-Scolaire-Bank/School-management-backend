import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const COLOR_STYLES = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  purple: "bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
};

// Carte de metrique reutilisable (Dashboard, Paiements) : icone sur puce coloree +
// libelle/valeur, plutot qu'une icone grise plate - donne une identite visuelle distincte
// a chaque indicateur au lieu d'une grille de cartes toutes identiques.
export default function StatCard({ label, value, icon: Icon, color = "blue" }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", COLOR_STYLES[color])}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
