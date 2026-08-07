import { CheckCircle2, XCircle, TriangleAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    className: "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  },
  error: {
    icon: XCircle,
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  warning: {
    icon: TriangleAlert,
    className: "border-amber-600/30 bg-amber-600/10 text-amber-700 dark:text-amber-400",
  },
  info: {
    icon: Info,
    className: "border-primary/30 bg-primary/10 text-primary",
  },
};

// Remplace les blocs de texte colore bruts (succes/erreur) par un encart avec icone,
// coherent sur toute l'appli - meme motif visuel que la banniere "accessDenied" de Layout.jsx.
function Alert({ variant = "info", className, children, ...props }) {
  const { icon: Icon, className: variantClassName } = VARIANTS[variant] ?? VARIANTS.info;
  return (
    <div
      role="alert"
      className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm", variantClassName, className)}
      {...props}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export { Alert };
