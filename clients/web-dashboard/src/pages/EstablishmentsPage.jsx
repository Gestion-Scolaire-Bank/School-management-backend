import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import apiClient from "../api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/components/ui/toast";
import { ESTABLISHMENT_STATUS, statusOf } from "@/lib/status";

const EMPTY_FORM = { name: "", address: "", city: "", phone: "", email: "" };

// UC23 - Gerer la configuration multi-etablissement (admin-service, section 3.7)
export default function EstablishmentsPage() {
  const [establishments, setEstablishments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function loadEstablishments() {
    setLoading(true);
    return apiClient
      .get("/api/v1/admin/establishments")
      .then((res) => setEstablishments(res.data || []))
      .catch(() => setEstablishments([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadEstablishments();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post("/api/v1/admin/establishments", form);
      setForm(EMPTY_FORM);
      await loadEstablishments();
      toast.add({ title: "Etablissement cree avec succes.", type: "success" });
    } catch {
      setError("Impossible de creer l'etablissement - verifiez les champs.");
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Etablissements</h2>
        <p className="text-sm text-muted-foreground">
          Configuration multi-etablissement de la plateforme.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ajouter un etablissement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" value={form.name} onChange={updateField("name")} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" value={form.city} onChange={updateField("city")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" value={form.address} onChange={updateField("address")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telephone</Label>
              <Input id="phone" value={form.phone} onChange={updateField("phone")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={updateField("email")} />
            </div>
            {error && (
              <Alert variant="error" className="sm:col-span-2">
                {error}
              </Alert>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creation..." : "Creer l'etablissement"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Etablissements enregistres</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : establishments.length === 0 ? (
            <EmptyState icon={Building2} message="Aucun etablissement enregistre." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {establishments.map((e) => {
                  const s = statusOf(ESTABLISHMENT_STATUS, e.status);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{e.city || "-"}</TableCell>
                      <TableCell>{e.email || e.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
