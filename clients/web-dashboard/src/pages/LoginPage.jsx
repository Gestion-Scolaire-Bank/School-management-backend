import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import apiClient from "../api/client";
import { setToken, getDefaultRouteForRole, getUser } from "../api/auth";
import AuthLayout from "@/components/AuthLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useI18n } from "@/lib/i18n";

// UC2 - Se connecter (document de conception, section 3.1)
export default function LoginPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post("/api/auth/login", { email, password });
      setToken(data.accessToken);
      const redirectTo = location.state?.from?.pathname || getDefaultRouteForRole(getUser()?.role);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err.response?.status === 429) {
        setError(err.response.data?.message || t("auth.login.error.rateLimit"));
      } else {
        setError(t("auth.login.error.invalid"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t("auth.login.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>
      </div>

      {location.state?.passwordResetSuccess && (
        <Alert variant="success">{t("auth.login.resetSuccess")}</Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("auth.field.email")}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("auth.field.password")}</Label>
            <Link to="/forgot-password" className="text-xs text-primary underline-offset-4 hover:underline">
              {t("auth.login.forgotLink")}
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
              className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        {error && <Alert variant="error">{error}</Alert>}
        <Button type="submit" className="h-10 w-full" disabled={loading}>
          {loading ? t("auth.login.submit.loading") : t("auth.login.submit")}
        </Button>
      </form>

      {/* Pas d'auto-inscription dans une appli scolaire : un compte (Parent, Enseignant,
          Directeur) est toujours cree par l'Administrateur de l'etablissement (page
          Inscriptions), qui declenche automatiquement un email pour choisir son mot de
          passe - cf. faille corrigee ou /api/auth/register etait accessible sans
          authentification. */}
      <p className="text-center text-sm text-muted-foreground">
        {t("auth.login.noAccount")}
      </p>
    </AuthLayout>
  );
}
