import { useEffect, useState } from "react";
import apiClient from "../api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { GraduationCap, Receipt } from "lucide-react";
import { PAYMENT_STATUS, statusOf } from "@/lib/status";

const PROVIDERS = ["MTN", "ORANGE"];

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

// UC9 - Payer les frais de scolarite (Mobile Money) / UC12 (vue Parent) - historique et recu
// (payment-service, section 3.3). Toutes ces routes sont reservees au role Parent.
//
// Point n.5 du chantier de coherence : le parent ne saisit plus de montant/devise/etablissement
// libres. Il choisit son enfant (GET /api/v1/registrations/children, deja resolu par email -
// cf. point n.6) puis un tarif reel (FeeSchedule) publie par l'etablissement. Le montant reste
// modifiable (versements partiels autorises) mais est borne server-side au solde restant du -
// payment-service rejette toute tentative de payer plus que ce qui est du.
export default function FeePaymentPage() {
  const [children, setChildren] = useState(null);
  const [childrenError, setChildrenError] = useState(null);
  const [loadingChildren, setLoadingChildren] = useState(true);

  const [selectedChildId, setSelectedChildId] = useState("");
  const [tariffYear, setTariffYear] = useState("2025-2026");
  const [tariffs, setTariffs] = useState(null);
  const [loadingTariffs, setLoadingTariffs] = useState(false);
  const [selectedFeeScheduleId, setSelectedFeeScheduleId] = useState("");

  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState("MTN");
  const [payerPhone, setPayerPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [receiptError, setReceiptError] = useState(null);

  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    apiClient
      .get("/api/v1/registrations/children")
      .then((res) => setChildren(res.data || []))
      .catch(() => setChildrenError("Impossible de charger la liste de vos enfants."))
      .finally(() => setLoadingChildren(false));
  }, []);

  const selectedChild = children?.find((c) => c.id === selectedChildId) || null;
  const selectedFeeSchedule = tariffs?.find((t) => t.id === selectedFeeScheduleId) || null;

  function loadTariffs(establishmentId, academicYear) {
    setTariffs(null);
    setSelectedFeeScheduleId("");
    if (!establishmentId || !academicYear) return;
    setLoadingTariffs(true);
    apiClient
      .get("/api/v1/admin/fee-schedules", { params: { establishmentId, academicYear } })
      .then((res) => setTariffs(res.data || []))
      .catch(() => setTariffs([]))
      .finally(() => setLoadingTariffs(false));
  }

  function loadHistory(childId) {
    setHistory(null);
    setHistoryError(null);
    if (!childId) return;
    setLoadingHistory(true);
    apiClient
      .get(`/api/v1/payments/student/${encodeURIComponent(childId)}`)
      .then((res) => setHistory(res.data || []))
      .catch(() => setHistoryError("Impossible de charger l'historique."))
      .finally(() => setLoadingHistory(false));
  }

  function selectChild(childId) {
    setSelectedChildId(childId);
    setTransaction(null);
    setPaymentError(null);
    const child = children?.find((c) => c.id === childId);
    loadTariffs(child?.establishmentId, tariffYear);
    loadHistory(childId);
  }

  function selectFeeSchedule(feeScheduleId) {
    setSelectedFeeScheduleId(feeScheduleId);
    const schedule = tariffs?.find((t) => t.id === feeScheduleId);
    setAmount(schedule ? String(schedule.amount) : "");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setPaymentError(null);
    setTransaction(null);
    try {
      const { data } = await apiClient.post(
        "/api/v1/payments/fees",
        {
          studentId: selectedChildId,
          feeScheduleId: selectedFeeScheduleId,
          amount: Number(amount),
          provider,
          payerPhone,
        },
        { headers: { "Idempotency-Key": crypto.randomUUID() } }
      );
      setTransaction(data);
      loadHistory(selectedChildId);
    } catch (err) {
      setPaymentError(err.response?.data?.message || "Impossible d'initier le paiement.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckStatus() {
    if (!transaction) return;
    setCheckingStatus(true);
    try {
      const { data } = await apiClient.get(`/api/v1/payments/${transaction.id}/status`);
      setTransaction(data);
    } catch {
      setPaymentError("Impossible de rafraichir le statut.");
    } finally {
      setCheckingStatus(false);
    }
  }

  async function handleDownloadReceipt(id) {
    setReceiptError(null);
    try {
      const { data } = await apiClient.get(`/api/v1/payments/${id}/receipt`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      window.open(url, "_blank", "noreferrer");
    } catch {
      setReceiptError("Recu indisponible pour cette transaction.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Paiement des frais</h2>
        <p className="text-sm text-muted-foreground">Payer les frais de scolarite via Mobile Money.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mon enfant</CardTitle>
          <CardDescription>Selectionnez l'enfant concerne par le paiement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingChildren && <p className="text-sm text-muted-foreground">Chargement...</p>}
          {childrenError && <Alert variant="error">{childrenError}</Alert>}
          {children && children.length === 0 && (
            <EmptyState
              icon={GraduationCap}
              message={
                "Aucun enfant n'est associe a l'adresse email de votre compte. Contactez l'administration de " +
                "l'etablissement pour verifier l'adresse email renseignee lors de l'inscription."
              }
            />
          )}
          {children && children.length > 0 && (
            <div className="min-w-48 max-w-sm space-y-1.5">
              <Label htmlFor="child">Enfant</Label>
              <Select value={selectedChildId} onValueChange={selectChild}>
                <SelectTrigger id="child" className="w-full">
                  <SelectValue placeholder="Choisir un enfant" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedChild && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nouveau paiement</CardTitle>
              <CardDescription>
                Le montant est verifie par rapport au tarif reel : impossible de payer plus que ce qui est du.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tariffYear">Annee scolaire</Label>
                  <Input
                    id="tariffYear"
                    value={tariffYear}
                    onChange={(e) => {
                      setTariffYear(e.target.value);
                      loadTariffs(selectedChild.establishmentId, e.target.value);
                    }}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="feeSchedule">Tarif</Label>
                  {loadingTariffs && <p className="text-sm text-muted-foreground">Chargement...</p>}
                  {tariffs && tariffs.length === 0 && (
                    <EmptyState
                      icon={Receipt}
                      message="Aucun tarif publie pour cet etablissement/annee - contactez l'administration."
                      className="py-4"
                    />
                  )}
                  {tariffs && tariffs.length > 0 && (
                    <Select value={selectedFeeScheduleId} onValueChange={selectFeeSchedule}>
                      <SelectTrigger id="feeSchedule" className="w-full">
                        <SelectValue placeholder="Choisir un tarif" />
                      </SelectTrigger>
                      <SelectContent>
                        {tariffs.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.label} - {Number(t.amount).toLocaleString("fr-FR")} {t.currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Montant a payer</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={!selectedFeeSchedule}
                    required
                  />
                  {selectedFeeSchedule && (
                    <p className="text-xs text-muted-foreground">
                      Montant du tarif : {Number(selectedFeeSchedule.amount).toLocaleString("fr-FR")}{" "}
                      {selectedFeeSchedule.currency}. Un versement partiel inferieur est accepte.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="provider">Operateur</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger id="provider" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p === "MTN" ? "MTN Mobile Money" : "Orange Money"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="payerPhone">Numero payeur</Label>
                  <Input
                    id="payerPhone"
                    placeholder="+237..."
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    required
                  />
                </div>
                {paymentError && (
                  <Alert variant="error" className="sm:col-span-2">
                    {paymentError}
                  </Alert>
                )}
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={submitting || !selectedFeeScheduleId}>
                    {submitting ? "Initiation..." : "Payer"}
                  </Button>
                </div>
              </form>

              {transaction && (
                <div className="mt-4 space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>
                      Transaction <span className="font-mono">{transaction.id}</span>
                    </span>
                    <Badge variant={statusOf(PAYMENT_STATUS, transaction.status).variant}>
                      {statusOf(PAYMENT_STATUS, transaction.status).label}
                    </Badge>
                  </div>
                  {transaction.failureReason && (
                    <p className="text-destructive">{transaction.failureReason}</p>
                  )}
                  {receiptError && <p className="text-destructive">{receiptError}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" disabled={checkingStatus} onClick={handleCheckStatus}>
                      {checkingStatus ? "..." : "Rafraichir le statut"}
                    </Button>
                    {transaction.status === "COMPLETED" && (
                      <Button size="sm" variant="outline" onClick={() => handleDownloadReceipt(transaction.id)}>
                        Telecharger le recu
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique des paiements</CardTitle>
              <CardDescription>Toutes les transactions pour {selectedChild.firstName} {selectedChild.lastName}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingHistory && <p className="text-sm text-muted-foreground">Chargement...</p>}
              {historyError && <Alert variant="error">{historyError}</Alert>}
              {history && history.length === 0 && <EmptyState icon={Receipt} message="Aucun paiement pour cet enfant." />}
              {history && history.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Montant</TableHead>
                      <TableHead>Operateur</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Recu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((t) => {
                      const s = statusOf(PAYMENT_STATUS, t.status);
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="text-muted-foreground">{formatDateTime(t.createdAt)}</TableCell>
                          <TableCell>
                            {Number(t.amount).toLocaleString("fr-FR")} {t.currency}
                          </TableCell>
                          <TableCell>{t.provider}</TableCell>
                          <TableCell>
                            <Badge variant={s.variant}>{s.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {t.status === "COMPLETED" && (
                              <Button size="sm" variant="outline" onClick={() => handleDownloadReceipt(t.id)}>
                                Voir
                              </Button>
                            )}
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
      )}
    </div>
  );
}
