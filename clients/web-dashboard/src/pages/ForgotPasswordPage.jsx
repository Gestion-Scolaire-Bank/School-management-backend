import { useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/client";
import AuthLayout from "@/components/AuthLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useI18n } from "@/lib/i18n";

// Point n.7 - Recuperation de mot de passe (auth-service). Reponse volontairement
// identique que l'email existe ou non (cf. AuthController#demanderUneReinitialisationDeMotDePasse) -
// on ne revele jamais si une adresse est enregistree.
export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiClient.post("/api/auth/password-reset/request", { email });
      setSubmitted(true);
    } catch {
      setError(t("auth.forgot.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t("auth.forgot.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("auth.forgot.subtitle")}
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4">
          <Alert variant="success">
            {t("auth.forgot.success")}
          </Alert>
          <Link to="/login" className="text-sm text-primary underline-offset-4 hover:underline">
            {t("auth.backToLogin")}
          </Link>
        </div>
      ) : (
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
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" className="h-10 w-full" disabled={loading}>
            {loading ? t("auth.forgot.submit.loading") : t("auth.forgot.submit")}
          </Button>
          <Link
            to="/login"
            className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {t("auth.backToLogin")}
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
