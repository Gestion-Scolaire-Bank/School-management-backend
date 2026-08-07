import { useEffect, useState } from "react";
import { Wallet, Receipt } from "lucide-react";
import apiClient from "../api/client";
import { getUser } from "../api/auth";
import StatCard from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { PAYMENT_STATUS, statusOf } from "@/lib/status";

const EMPTY_FEE = { establishmentId: "", classId: "", academicYear: "2025-2026", label: "", amount: "" };
const NO_CLASS_VALUE = "__all__";
const PROVIDERS = ["MTN", "ORANGE"];
const STAFF_ROLES = ["ENSEIGNANT", "ADMINISTRATEUR", "DIRECTEUR"];
const EMPTY_SALARY = { staffUserId: "", establishmentId: "", amount: "", provider: "MTN", recipientPhone: "" };
const EMPTY_CASH = { establishmentId: "", classId: "", studentId: "", academicYear: "2025-2026", feeScheduleId: "", amount: "" };

// UC12 - Consulter le rapport de recettes (payment-service, section 3.3), et gestion des
// tarifs attendus (admin-service) - remplace le "defaultTuitionFee" unique et jamais utilise
// de GlobalConfig : desormais un vrai tarif par etablissement/classe/annee, que le parent
// peut consulter avant de payer (cf. FeePaymentPage.jsx).
export default function PaymentsPage() {
  const isAdmin = getUser()?.role === "ADMINISTRATEUR";

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [establishments, setEstablishments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [fee, setFee] = useState(EMPTY_FEE);
  const [feeStatus, setFeeStatus] = useState(null);
  const [submittingFee, setSubmittingFee] = useState(false);

  const [tariffEstablishmentId, setTariffEstablishmentId] = useState("");
  const [tariffYear, setTariffYear] = useState("2025-2026");
  const [tariffs, setTariffs] = useState(null);
  const [loadingTariffs, setLoadingTariffs] = useState(false);

  const [staff, setStaff] = useState([]);
  const [salary, setSalary] = useState(EMPTY_SALARY);
  const [submittingSalary, setSubmittingSalary] = useState(false);
  const [salaryError, setSalaryError] = useState(null);
  const [salaryTransaction, setSalaryTransaction] = useState(null);
  const [checkingSalaryStatus, setCheckingSalaryStatus] = useState(false);

  const [cash, setCash] = useState(EMPTY_CASH);
  const [cashStudents, setCashStudents] = useState([]);
  const [cashFeeSchedules, setCashFeeSchedules] = useState([]);
  const [submittingCash, setSubmittingCash] = useState(false);
  const [cashError, setCashError] = useState(null);
  const [cashTransaction, setCashTransaction] = useState(null);

  useEffect(() => {
    apiClient
      .get("/api/v1/payments/reports/revenue")
      .then((res) => setReport(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    apiClient
      .get("/api/v1/admin/establishments")
      .then((res) => setEstablishments(res.data || []))
      .catch(() => setEstablishments([]));
    apiClient
      .get("/api/v1/admin/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => setClasses([]));
    if (isAdmin) {
      apiClient
        .get("/api/auth/users")
        .then((res) => setStaff((res.data || []).filter((u) => STAFF_ROLES.includes(u.role))))
        .catch(() => setStaff([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSalarySubmit(e) {
    e.preventDefault();
    setSubmittingSalary(true);
    setSalaryError(null);
    setSalaryTransaction(null);
    try {
      const { data } = await apiClient.post(
        "/api/v1/payments/salary",
        { ...salary, amount: Number(salary.amount) },
        { headers: { "Idempotency-Key": crypto.randomUUID() } }
      );
      setSalaryTransaction(data);
      setSalary((s) => ({ ...EMPTY_SALARY, establishmentId: s.establishmentId, provider: s.provider }));
    } catch (err) {
      setSalaryError(err.response?.data?.message || "Impossible d'initier le paiement du salaire.");
    } finally {
      setSubmittingSalary(false);
    }
  }

  async function handleCheckSalaryStatus() {
    if (!salaryTransaction) return;
    setCheckingSalaryStatus(true);
    try {
      const { data } = await apiClient.get(`/api/v1/payments/${salaryTransaction.id}/status`);
      setSalaryTransaction(data);
    } catch {
      setSalaryError("Impossible de rafraichir le statut.");
    } finally {
      setCheckingSalaryStatus(false);
    }
  }

  function loadCashClassRoster(classId) {
    setCash((c) => ({ ...c, classId, studentId: "" }));
    setCashStudents([]);
    if (!classId) return;
    apiClient
      .get(`/api/v1/registrations/class/${classId}`)
      .then((res) => setCashStudents(res.data || []))
      .catch(() => setCashStudents([]));
  }

  function loadCashFeeSchedules(establishmentId, academicYear) {
    setCash((c) => ({ ...c, establishmentId, classId: "", studentId: "", feeScheduleId: "", amount: "" }));
    setCashStudents([]);
    setCashFeeSchedules([]);
    if (!establishmentId || !academicYear) return;
    apiClient
      .get("/api/v1/admin/fee-schedules", { params: { establishmentId, academicYear } })
      .then((res) => setCashFeeSchedules(res.data || []))
      .catch(() => setCashFeeSchedules([]));
  }

  async function handleCashSubmit(e) {
    e.preventDefault();
    setSubmittingCash(true);
    setCashError(null);
    setCashTransaction(null);
    try {
      const { data } = await apiClient.post(
        "/api/v1/payments/fees",
        {
          studentId: cash.studentId,
          feeScheduleId: cash.feeScheduleId,
          amount: Number(cash.amount),
          provider: "CASH",
        },
        { headers: { "Idempotency-Key": crypto.randomUUID() } }
      );
      setCashTransaction(data);
      setCash((c) => ({ ...EMPTY_CASH, establishmentId: c.establishmentId, academicYear: c.academicYear }));
      setCashStudents([]);
    } catch (err) {
      setCashError(err.response?.data?.message || "Impossible d'enregistrer ce paiement en especes.");
    } finally {
      setSubmittingCash(false);
    }
  }

  async function handleDownloadCashReceipt(id) {
    setCashError(null);
    try {
      const { data } = await apiClient.get(`/api/v1/payments/${id}/receipt`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      window.open(url, "_blank", "noreferrer");
    } catch {
      setCashError("Recu indisponible pour cette transaction.");
    }
  }

  async function handleFeeSubmit(e) {
    e.preventDefault();
    setSubmittingFee(true);
    setFeeStatus(null);
    try {
      await apiClient.post("/api/v1/admin/fee-schedules", {
        ...fee,
        classId: fee.classId === NO_CLASS_VALUE ? null : fee.classId || null,
        amount: Number(fee.amount),
      });
      setFeeStatus({ type: "success", text: "Tarif cree." });
      setFee((f) => ({ ...EMPTY_FEE, establishmentId: f.establishmentId, academicYear: f.academicYear }));
      if (tariffEstablishmentId === fee.establishmentId) {
        loadTariffs(tariffEstablishmentId, tariffYear);
      }
    } catch (err) {
      setFeeStatus({ type: "error", text: err.response?.data?.message || "Impossible de creer ce tarif." });
    } finally {
      setSubmittingFee(false);
    }
  }

  function loadTariffs(establishmentId, academicYear) {
    setTariffEstablishmentId(establishmentId);
    setTariffYear(academicYear);
    setTariffs(null);
    if (!establishmentId || !academicYear) return;
    setLoadingTariffs(true);
    apiClient
      .get("/api/v1/admin/fee-schedules", { params: { establishmentId, academicYear } })
      .then((res) => setTariffs(res.data || []))
      .catch(() => setTariffs([]))
      .finally(() => setLoadingTariffs(false));
  }

  function classNameById(id) {
    if (!id) return "Toutes les classes";
    return classes.find((c) => c.id === id)?.name || id;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Paiements &amp; recettes</h2>
        <p className="text-sm text-muted-foreground">
          Rapport de recettes agrege depuis payment-service, et tarifs attendus par etablissement.
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Chargement...</p>}
      {error && <Alert variant="error">Rapport de recettes indisponible (payment-service injoignable).</Alert>}

      {report && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Recettes totales"
            value={`${Number(report.totalRevenue ?? 0).toLocaleString("fr-FR")} XAF`}
            icon={Wallet}
            color="emerald"
          />
          <StatCard label="Transactions" value={report.transactionCount ?? 0} icon={Receipt} color="blue" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Creer un tarif</CardTitle>
            <CardDescription>
              Frais de scolarite, inscription... - laissez "Classe" vide pour l'appliquer a toute une
              annee scolaire.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFeeSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="feeEstablishment">Etablissement</Label>
                <Select
                  value={fee.establishmentId}
                  onValueChange={(value) => setFee((f) => ({ ...f, establishmentId: value }))}
                >
                  <SelectTrigger id="feeEstablishment" className="w-full">
                    <SelectValue placeholder="Choisir un etablissement">
                      {(value) => establishments.find((e) => e.id === value)?.name || "Choisir un etablissement"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {establishments.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="feeClass">Classe (optionnel)</Label>
                <Select value={fee.classId} onValueChange={(value) => setFee((f) => ({ ...f, classId: value }))}>
                  <SelectTrigger id="feeClass" className="w-full">
                    <SelectValue placeholder="Toutes les classes">
                      {(value) =>
                        value === NO_CLASS_VALUE || !value
                          ? "Toutes les classes"
                          : classes.find((c) => c.id === value)?.name || "Toutes les classes"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CLASS_VALUE}>Toutes les classes</SelectItem>
                    {classes
                      .filter((c) => c.establishmentId === fee.establishmentId)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feeLabel">Libelle</Label>
                <Input
                  id="feeLabel"
                  placeholder="ex. Trimestre 1"
                  value={fee.label}
                  onChange={(e) => setFee((f) => ({ ...f, label: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feeAmount">Montant (XAF)</Label>
                <Input
                  id="feeAmount"
                  type="number"
                  min="1"
                  value={fee.amount}
                  onChange={(e) => setFee((f) => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="feeYear">Annee scolaire</Label>
                <Input
                  id="feeYear"
                  value={fee.academicYear}
                  onChange={(e) => setFee((f) => ({ ...f, academicYear: e.target.value }))}
                  required
                />
              </div>
              {feeStatus && (
                <Alert variant={feeStatus.type === "success" ? "success" : "error"} className="sm:col-span-2">
                  {feeStatus.text}
                </Alert>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submittingFee || !fee.establishmentId}>
                  {submittingFee ? "Creation..." : "Creer le tarif"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tarifs enregistres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-48 flex-1 space-y-1.5">
                <Label htmlFor="tariffEstablishment">Etablissement</Label>
                <Select value={tariffEstablishmentId} onValueChange={(value) => loadTariffs(value, tariffYear)}>
                  <SelectTrigger id="tariffEstablishment" className="w-full">
                    <SelectValue placeholder="Choisir un etablissement">
                      {(value) => establishments.find((e) => e.id === value)?.name || "Choisir un etablissement"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {establishments.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-36 space-y-1.5">
                <Label htmlFor="tariffYear">Annee</Label>
                <Input
                  id="tariffYear"
                  value={tariffYear}
                  onChange={(e) => loadTariffs(tariffEstablishmentId, e.target.value)}
                />
              </div>
            </div>

            {loadingTariffs && <p className="text-sm text-muted-foreground">Chargement...</p>}
            {tariffs && tariffs.length === 0 && (
              <EmptyState icon={Receipt} message="Aucun tarif pour cet etablissement/annee." />
            )}
            {tariffs && tariffs.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Libelle</TableHead>
                    <TableHead>Classe</TableHead>
                    <TableHead>Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tariffs.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.label}</TableCell>
                      <TableCell>{classNameById(t.classId)}</TableCell>
                      <TableCell>
                        {Number(t.amount).toLocaleString("fr-FR")} {t.currency}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Enregistrer un paiement en especes</CardTitle>
            <CardDescription>
              Pour un parent qui paie au secretariat plutot que par Mobile Money - le paiement est
              marque regle immediatement, sans passer par un fournisseur externe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCashSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cashEstablishment">Etablissement</Label>
                <Select
                  value={cash.establishmentId}
                  onValueChange={(value) => loadCashFeeSchedules(value, cash.academicYear)}
                >
                  <SelectTrigger id="cashEstablishment" className="w-full">
                    <SelectValue placeholder="Choisir un etablissement">
                      {(value) => establishments.find((e) => e.id === value)?.name || "Choisir un etablissement"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {establishments.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cashClass">Classe</Label>
                <Select value={cash.classId} onValueChange={loadCashClassRoster} disabled={!cash.establishmentId}>
                  <SelectTrigger id="cashClass" className="w-full">
                    <SelectValue placeholder="Choisir une classe">
                      {(value) => classes.find((c) => c.id === value)?.name || "Choisir une classe"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {classes
                      .filter((c) => c.establishmentId === cash.establishmentId)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cashStudent">Eleve</Label>
                <Select
                  value={cash.studentId}
                  onValueChange={(value) => setCash((c) => ({ ...c, studentId: value }))}
                  disabled={!cash.classId}
                >
                  <SelectTrigger id="cashStudent" className="w-full">
                    <SelectValue placeholder="Choisir un eleve">
                      {(value) => {
                        const s = cashStudents.find((st) => st.id === value);
                        return s ? `${s.firstName} ${s.lastName}` : "Choisir un eleve";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {cashStudents.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">Aucun eleve dans cette classe</div>
                    )}
                    {cashStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cashTariff">Tarif</Label>
                <Select
                  value={cash.feeScheduleId}
                  onValueChange={(value) => {
                    const schedule = cashFeeSchedules.find((f) => f.id === value);
                    setCash((c) => ({ ...c, feeScheduleId: value, amount: schedule ? String(schedule.amount) : c.amount }));
                  }}
                  disabled={!cash.establishmentId}
                >
                  <SelectTrigger id="cashTariff" className="w-full">
                    <SelectValue placeholder="Choisir un tarif">
                      {(value) => {
                        const f = cashFeeSchedules.find((sch) => sch.id === value);
                        return f
                          ? `${f.label} - ${Number(f.amount).toLocaleString("fr-FR")} ${f.currency}`
                          : "Choisir un tarif";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {cashFeeSchedules.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Aucun tarif pour cet etablissement/annee
                      </div>
                    )}
                    {cashFeeSchedules.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.label} - {Number(f.amount).toLocaleString("fr-FR")} {f.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cashAmount">Montant recu (XAF)</Label>
                <Input
                  id="cashAmount"
                  type="number"
                  min="1"
                  value={cash.amount}
                  onChange={(e) => setCash((c) => ({ ...c, amount: e.target.value }))}
                  disabled={!cash.feeScheduleId}
                  required
                />
                <p className="text-xs text-muted-foreground">Un versement partiel inferieur au tarif est accepte.</p>
              </div>
              {cashError && (
                <Alert variant="error" className="sm:col-span-2">
                  {cashError}
                </Alert>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submittingCash || !cash.studentId || !cash.feeScheduleId}>
                  {submittingCash ? "Enregistrement..." : "Enregistrer le paiement"}
                </Button>
              </div>
            </form>

            {cashTransaction && (
              <div className="mt-4 space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    Transaction <span className="font-mono">{cashTransaction.id}</span>
                  </span>
                  <Badge variant={statusOf(PAYMENT_STATUS, cashTransaction.status).variant}>
                    {statusOf(PAYMENT_STATUS, cashTransaction.status).label}
                  </Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleDownloadCashReceipt(cashTransaction.id)}>
                  Telecharger le recu
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">Payer un salaire</CardTitle>
            <CardDescription>Verser un salaire via Mobile Money a un membre du personnel.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalarySubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="salaryStaff">Membre du personnel</Label>
                <Select
                  value={salary.staffUserId}
                  onValueChange={(value) => setSalary((s) => ({ ...s, staffUserId: value }))}
                >
                  <SelectTrigger id="salaryStaff" className="w-full">
                    <SelectValue placeholder="Choisir une personne">
                      {(value) => staff.find((u) => u.id === value)?.fullName || "Choisir une personne"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="salaryEstablishment">Etablissement</Label>
                <Select
                  value={salary.establishmentId}
                  onValueChange={(value) => setSalary((s) => ({ ...s, establishmentId: value }))}
                >
                  <SelectTrigger id="salaryEstablishment" className="w-full">
                    <SelectValue placeholder="Choisir un etablissement">
                      {(value) => establishments.find((e) => e.id === value)?.name || "Choisir un etablissement"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {establishments.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="salaryAmount">Montant (XAF)</Label>
                <Input
                  id="salaryAmount"
                  type="number"
                  min="1"
                  value={salary.amount}
                  onChange={(e) => setSalary((s) => ({ ...s, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="salaryProvider">Operateur</Label>
                <Select value={salary.provider} onValueChange={(value) => setSalary((s) => ({ ...s, provider: value }))}>
                  <SelectTrigger id="salaryProvider" className="w-full">
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
                <Label htmlFor="salaryPhone">Numero destinataire</Label>
                <Input
                  id="salaryPhone"
                  placeholder="+237..."
                  value={salary.recipientPhone}
                  onChange={(e) => setSalary((s) => ({ ...s, recipientPhone: e.target.value }))}
                  required
                />
              </div>
              {salaryError && (
                <Alert variant="error" className="sm:col-span-2">
                  {salaryError}
                </Alert>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submittingSalary || !salary.staffUserId}>
                  {submittingSalary ? "Initiation..." : "Payer le salaire"}
                </Button>
              </div>
            </form>

            {salaryTransaction && (
              <div className="mt-4 space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    Transaction <span className="font-mono">{salaryTransaction.id}</span>
                  </span>
                  <Badge variant={statusOf(PAYMENT_STATUS, salaryTransaction.status).variant}>
                    {statusOf(PAYMENT_STATUS, salaryTransaction.status).label}
                  </Badge>
                </div>
                {salaryTransaction.failureReason && (
                  <p className="text-destructive">{salaryTransaction.failureReason}</p>
                )}
                <Button size="sm" variant="outline" disabled={checkingSalaryStatus} onClick={handleCheckSalaryStatus}>
                  {checkingSalaryStatus ? "..." : "Rafraichir le statut"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
