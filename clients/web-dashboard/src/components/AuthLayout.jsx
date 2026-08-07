import { GraduationCap, Wallet, ClipboardCheck } from "lucide-react";

const FEATURES = [
  { icon: GraduationCap, text: "Inscriptions et suivi des eleves" },
  { icon: Wallet, text: "Paiement des frais en ligne" },
  { icon: ClipboardCheck, text: "Presence, notes et bulletins" },
];

// Ecran partage par les 3 pages non authentifiees (Connexion, Mot de passe oublie,
// Nouveau mot de passe) - evite de dupliquer le panneau de marque dans chacune.
export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-5">
      <div className="relative hidden overflow-hidden bg-primary lg:col-span-3 lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, color-mix(in oklch, var(--primary-foreground) 18%, transparent) 0, transparent 45%), radial-gradient(circle at 80% 80%, color-mix(in oklch, var(--primary-foreground) 14%, transparent) 0, transparent 50%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(color-mix(in oklch, var(--primary-foreground) 100%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklch, var(--primary-foreground) 100%, transparent) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <GraduationCap
          className="pointer-events-none absolute -bottom-24 -right-24 size-[28rem] text-primary-foreground/[0.07]"
          strokeWidth={0.75}
        />
        <div className="relative flex w-full flex-col justify-center px-16 xl:px-24">
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15 text-primary-foreground ring-1 ring-primary-foreground/20">
              <GraduationCap className="size-5" />
            </div>
            <span className="text-sm font-medium tracking-wide text-primary-foreground/90">SchoolManage</span>
          </div>
          <h1 className="max-w-md text-5xl font-semibold leading-[1.1] tracking-tight text-primary-foreground xl:text-6xl">
            La gestion scolaire, simplifiee.
          </h1>
          <p className="mt-5 max-w-sm text-base text-primary-foreground/70">
            La plateforme qui relie administration, enseignants et parents autour du parcours de
            chaque eleve.
          </p>
          <ul className="mt-10 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-primary-foreground/85">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
                  <Icon className="size-4" />
                </div>
                <span className="text-sm">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-center bg-background p-6 lg:col-span-2">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="size-6" />
            </div>
            <span className="text-lg font-semibold text-foreground">SchoolManage</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
