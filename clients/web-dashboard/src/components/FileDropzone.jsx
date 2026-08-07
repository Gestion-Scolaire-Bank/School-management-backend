import { UploadCloud, FileText, X } from "lucide-react";
import { Label } from "@/components/ui/label";

// Zone de depot de fichier reutilisable (input natif cache + zone stylee) - extrait de
// ResourcesPage pour etre reutilise partout ou un fichier optionnel/obligatoire est demande
// (inscription : photo, acte de naissance, CV, diplome).
export default function FileDropzone({ id, label, file, onChange, required = false, accept }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-background px-3 text-center transition-colors hover:bg-muted peer-focus-visible:border-ring peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50"
      >
        {file ? (
          <span className="flex items-center gap-2 text-sm text-foreground">
            <FileText className="size-4 text-muted-foreground" />
            <span className="max-w-40 truncate">{file.name}</span>
            <span
              role="button"
              tabIndex={0}
              aria-label="Supprimer le fichier"
              onClick={(e) => {
                e.preventDefault();
                onChange(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange(null);
                }
              }}
              className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <UploadCloud className="size-4" />
            Choisir un fichier{required ? "" : " (optionnel)"}
          </span>
        )}
      </label>
    </div>
  );
}
