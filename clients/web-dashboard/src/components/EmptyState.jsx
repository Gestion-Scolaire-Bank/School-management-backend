import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

// Remplace les blocs "Aucun..." en texte brut par un etat vide coherent (icone + message),
// utilise partout ou une liste/tableau peut etre vide.
function EmptyState({ icon: Icon = Inbox, message, className, ...props }) {
  return (
    <div className={cn("flex flex-col items-center gap-2 py-8 text-center", className)} {...props}>
      <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export { EmptyState };
