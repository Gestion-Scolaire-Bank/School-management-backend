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
import { useI18n } from "@/lib/i18n";

const EMPTY_FORM = { name: "", address: "", city: "", phone: "", email: "", timeFormat: "24h", timeZone: "UTC", currency: "XAF", slogan: "", description: "" };

export default function EstablishmentsPage() {
  const { t } = useI18n();
  const [establishments, setEstablishments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function loadEstablishments() {
    setLoading(true);
    return apiClient.get("/api/v1/admin/establishments").then((res) => setEstablishments(res.data || [])).catch(() => setEstablishments([])).finally(() => setLoading(false));
  }
  useEffect(() => { loadEstablishments(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post("/api/v1/admin/establishments", form);
      setForm(EMPTY_FORM);
      await loadEstablishments();
      toast.add({ title: t("est.success"), type: "success" });
    } catch { setError(t("est.error")); } finally { setSubmitting(false); }
  }
  function updateField(field) { return (e) => setForm((f) => ({ ...f, [field]: e.target.value })); }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t("est.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("est.subtitle")}</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">{t("est.addTitle")}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="name">{t("est.field.name")}</Label><Input id="name" value={form.name} onChange={updateField("name")} required /></div>
            <div className="space-y-1.5"><Label htmlFor="city">{t("est.field.city")}</Label><Input id="city" value={form.city} onChange={updateField("city")} /></div>
            <div className="space-y-1.5"><Label htmlFor="address">{t("est.field.address")}</Label><Input id="address" value={form.address} onChange={updateField("address")} /></div>
            <div className="space-y-1.5"><Label htmlFor="phone">{t("est.field.phone")}</Label><Input id="phone" value={form.phone} onChange={updateField("phone")} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="email">{t("est.field.email")}</Label><Input id="email" type="email" value={form.email} onChange={updateField("email")} /></div>
            <div className="space-y-1.5"><Label htmlFor="timeFormat">{t("est.field.timeFormat")}</Label><Input id="timeFormat" value={form.timeFormat} onChange={updateField("timeFormat")} /></div>
            <div className="space-y-1.5"><Label htmlFor="timeZone">{t("est.field.timeZone")}</Label><Input id="timeZone" value={form.timeZone} onChange={updateField("timeZone")} /></div>
            <div className="space-y-1.5"><Label htmlFor="currency">{t("est.field.currency")}</Label><Input id="currency" value={form.currency} onChange={updateField("currency")} /></div>
            <div className="space-y-1.5"><Label htmlFor="slogan">{t("est.field.slogan")}</Label><Input id="slogan" value={form.slogan} onChange={updateField("slogan")} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="description">{t("est.field.description")}</Label><Input id="description" value={form.description} onChange={updateField("description")} /></div>
            {error && <Alert variant="error" className="sm:col-span-2">{error}</Alert>}
            <div className="sm:col-span-2"><Button type="submit" disabled={submitting}>{submitting ? t("est.creating") : t("est.create")}</Button></div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">{t("est.listTitle")}</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">{t("est.loading")}</p> : establishments.length === 0 ? <EmptyState icon={Building2} message={t("est.empty")} /> : (
            <Table>
              <TableHeader><TableRow><TableHead>{t("est.table.name")}</TableHead><TableHead>{t("est.table.city")}</TableHead><TableHead>{t("est.table.contact")}</TableHead><TableHead>{t("est.table.status")}</TableHead></TableRow></TableHeader>
              <TableBody>{establishments.map((e) => { const s = statusOf(ESTABLISHMENT_STATUS, e.status); return (<TableRow key={e.id}><TableCell className="font-medium">{e.name}</TableCell><TableCell>{e.city || "-"}</TableCell><TableCell>{e.email || e.phone || "-"}</TableCell><TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell></TableRow>); })}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
