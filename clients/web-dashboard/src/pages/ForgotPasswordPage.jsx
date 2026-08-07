import { useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/client";
import AuthLayout from "@/components/AuthLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

// Point n.7 - Recuperation de mot de passe (auth-service). Reponse volontairement
// identique que l'email existe ou non (cf. AuthController#demanderUneReinitialisationDeMotDePasse) -
// on ne revele jamais si une adresse est enregistree.
export default function ForgotPasswordPage() {
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
      setError("Une erreur est survenue - reessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Mot de passe oublie</h2>
        <p className="text-sm text-muted-foreground">
          Indiquez votre email, nous vous enverrons un lien pour choisir un nouveau mot de passe.
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4">
          <Alert variant="success">
            Si un compte existe avec cette adresse, un email contenant un lien de reinitialisation
            vient d'etre envoye. Le lien est valable 1 heure.
          </Alert>
          <Link to="/login" className="text-sm text-primary underline-offset-4 hover:underline">
            Retour a la connexion
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
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
            {loading ? "Envoi..." : "Envoyer le lien"}
          </Button>
          <Link
            to="/login"
            className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Retour a la connexion
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
