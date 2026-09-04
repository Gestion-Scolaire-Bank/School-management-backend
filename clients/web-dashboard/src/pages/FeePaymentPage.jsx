import { useEffect, useRef, useState } from "react";
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
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
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

  // request guards: ignore out-of-order responses so selecting another
  // child/input never displays stale data or wipes the current view
  const tariffsReq = useRef(0);
  const historyReq = useRef(0);
  const yearDebounce = useRef(null);

  useEffect(() => () => clearTimeout(yearDebounce.current), []);

  useEffect(() => {
    apiClient
      .get("/api/v1/registrations/children")
      .then((res) => setChildren(res.data || []))
      .catch(() => setChildrenError(t("fees.childrenError")))
      .finally(() => setLoadingChildren(false));
  }, []);

  const selectedChild = children?.find((c) => c.id === selectedChildId) || null;
  const selectedFeeSchedule = tariffs?.find((t) => t.id === selectedFeeScheduleId) || null;

  function loadTariffs(establishmentId, academicYear, { resetSelection = true } = {}) {
    // keep previous tariffs visible while loading (no wipe on each keystroke)
    if (resetSelection) setSelectedFeeScheduleId("");
    if (!establishmentId || !academicYear) return;
    const id = ++tariffsReq.current;
    setLoadingTariffs(true);
    apiClient
      .get("/api/v1/admin/fee-schedules", { params: { establishmentId, academicYear } })
      .then((res) => { if (tariffsReq.current === id) setTariffs(res.data || []); })
      .catch(() => {})
      .finally(() => { if (tariffsReq.current === id) setLoadingTariffs(false); });
  }

  // year is typed char by char: debounce so intermediate values (e.g. "2025-")
  // don't fire failing requests that collapse the tariff select
  function handleTariffYearChange(value) {
    setTariffYear(value);
    clearTimeout(yearDebounce.current);
    yearDebounce.current = setTimeout(() => {
      if (selectedChild) loadTariffs(selectedChild.establishmentId, value, { resetSelection: false });
    }, 500);
  }

  function loadHistory(childId) {
    // keep previous history visible while loading; ignore stale responses
    setHistoryError(null);
    if (!childId) return;
    const id = ++historyReq.current;
    setLoadingHistory(true);
    apiClient
      .get(`/api/v1/payments/student/${encodeURIComponent(childId)}`)
      .then((res) => { if (historyReq.current === id) setHistory(res.data || []); })
      .catch(() => { if (historyReq.current === id) setHistoryError(t("fees.historyError")); })
      .finally(() => { if (historyReq.current === id) setLoadingHistory(false); });
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
      setPaymentError(err.response?.data?.message || t("fees.error"));
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
      setPaymentError(t("fees.statusError"));
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
      setReceiptError(t("fees.receiptError"));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t("fees.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("fees.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("fees.child.title")}</CardTitle>
          <CardDescription>{t("fees.child.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingChildren && <p className="text-sm text-muted-foreground">{t("pay.loading")}</p>}
          {childrenError && <Alert variant="error">{childrenError}</Alert>}
          {children && children.length === 0 && (
            <EmptyState
              icon={GraduationCap}
              message={t("fees.child.empty")}
            />
          )}
          {children && children.length > 0 && (
            <div className="min-w-48 max-w-sm space-y-1.5">
              <Label htmlFor="child">{t("fees.child.label")}</Label>
              <Select value={selectedChildId} onValueChange={selectChild}>
                <SelectTrigger id="child" className="w-full">
                  <SelectValue placeholder={t("fees.child.placeholder")} />
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
              <CardTitle className="text-base">{t("fees.new.title")}</CardTitle>
              <CardDescription>
                {t("fees.new.subtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="tariffYear">{t("fees.field.year")}</Label>
                  <Input
                    id="tariffYear"
                    value={tariffYear}
                    onChange={(e) => handleTariffYearChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="feeSchedule">{t("fees.field.tariff")}</Label>
                  {loadingTariffs && <p className="text-sm text-muted-foreground">{t("pay.loading")}</p>}
                  {tariffs && tariffs.length === 0 && (
                    <EmptyState
                      icon={Receipt}
                      message={t("fees.tariffs.empty")}
                      className="py-4"
                    />
                  )}
                  {tariffs && tariffs.length > 0 && (
                    <Select value={selectedFeeScheduleId} onValueChange={selectFeeSchedule}>
                      <SelectTrigger id="feeSchedule" className="w-full">
                        <SelectValue placeholder={t("fees.field.tariff.placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {tariffs.map((tt) => (
                          <SelectItem key={tt.id} value={tt.id}>
                            {tt.label} - {Number(tt.amount).toLocaleString("fr-FR")} {tt.currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="amount">{t("fees.field.amount")}</Label>
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
                      {t("fees.field.amount.hint", { amount: Number(selectedFeeSchedule.amount).toLocaleString("fr-FR"), currency: selectedFeeSchedule.currency })}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="provider">{t("fees.field.provider")}</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger id="provider" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p === "MTN" ? t("common.mtn") : t("common.orange")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="payerPhone">{t("fees.field.phone")}</Label>
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
                    {submitting ? t("fees.submitting") : t("fees.submit")}
                  </Button>
                </div>
              </form>

              {transaction && (
                <div className="mt-4 space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span>
                      {t("fees.transaction")} <span className="font-mono">{transaction.id}</span>
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
                      {checkingStatus ? "..." : t("fees.refresh")}
                    </Button>
                    {transaction.status === "COMPLETED" && (
                      <Button size="sm" variant="outline" onClick={() => handleDownloadReceipt(transaction.id)}>
                        {t("fees.receipt")}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("fees.history.title")}</CardTitle>
              <CardDescription>{t("fees.history.subtitle", { name: `${selectedChild.firstName} ${selectedChild.lastName}` })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingHistory && <p className="text-sm text-muted-foreground">{t("pay.loading")}</p>}
              {historyError && <Alert variant="error">{historyError}</Alert>}
              {history && history.length === 0 && <EmptyState icon={Receipt} message={t("fees.history.empty")} />}
              {history && history.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("fees.history.table.date")}</TableHead>
                      <TableHead>{t("fees.history.table.amount")}</TableHead>
                      <TableHead>{t("fees.history.table.provider")}</TableHead>
                      <TableHead>{t("fees.history.table.status")}</TableHead>
                      <TableHead className="text-right">{t("fees.history.table.receipt")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((tx) => {
                      const s = statusOf(PAYMENT_STATUS, tx.status);
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-muted-foreground">{formatDateTime(tx.createdAt)}</TableCell>
                          <TableCell>
                            {Number(tx.amount).toLocaleString("fr-FR")} {tx.currency}
                          </TableCell>
                          <TableCell>{tx.provider}</TableCell>
                          <TableCell>
                            <Badge variant={s.variant}>{s.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {tx.status === "COMPLETED" && (
                              <Button size="sm" variant="outline" onClick={() => handleDownloadReceipt(tx.id)}>
                                {t("fees.history.view")}
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
