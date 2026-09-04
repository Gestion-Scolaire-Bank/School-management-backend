import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import apiClient from "../api/client";
import AuthLayout from "@/components/AuthLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useI18n } from "@/lib/i18n";

// Point n.7 - Finalise la reinitialisation a partir du jeton recu par email (URL de la
// forme /reset-password?token=...). Le jeton est a usage unique et expire au bout d'1h
// (cf. AuthController#confirmerLaReinitialisationDeMotDePasse).
export default function ResetPasswordPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError(t("auth.reset.error.mismatch"));
      return;
    }

    setLoading(true);
    try {
      await apiClient.post("/api/auth/password-reset/confirm", { token, newPassword });
      navigate("/login", { state: { passwordResetSuccess: true } });
    } catch (err) {
      setError(err.response?.data?.message || t("auth.reset.error.invalidLink"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t("auth.reset.title")}</h2>

      {!token ? (
        <Alert variant="error">
          {t("auth.reset.incomplete")}{" "}
          <Link to="/forgot-password" className="underline-offset-4 hover:underline">
            {t("auth.reset.forgotLink")}
          </Link>
          .
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">{t("auth.reset.field.newPassword")}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              autoFocus
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">{t("auth.reset.field.confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="h-10"
            />
          </div>
          {error && <Alert variant="error">{error}</Alert>}
          <Button type="submit" className="h-10 w-full" disabled={loading}>
            {loading ? t("auth.reset.submit.loading") : t("auth.reset.submit")}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
