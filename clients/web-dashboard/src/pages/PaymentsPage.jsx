import { useEffect, useRef, useState } from "react";
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
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
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
  const [loadingCashRoster, setLoadingCashRoster] = useState(false);
  const [loadingCashSchedules, setLoadingCashSchedules] = useState(false);
  const [submittingCash, setSubmittingCash] = useState(false);
  const [cashError, setCashError] = useState(null);
  const [cashTransaction, setCashTransaction] = useState(null);
  // request guards: ignore out-of-order responses so fast select changes
  // never display data for a previously selected input (stale-while-revalidate)
  const cashRosterReq = useRef(0);
  const cashSchedReq = useRef(0);
  const tariffReq = useRef(0);
  const tariffDebounce = useRef(null);

  useEffect(() => {
    apiClient
      .get("/api/v1/payments/reports/revenue")
      .then((res) => setReport(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // reference lists: keep previous data on error, never wipe to []
    apiClient
      .get("/api/v1/admin/establishments")
      .then((res) => setEstablishments(res.data || []))
      .catch(() => {});
    apiClient
      .get("/api/v1/admin/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => {});
    if (isAdmin) {
      apiClient
        .get("/api/auth/users")
        .then((res) => setStaff((res.data || []).filter((u) => STAFF_ROLES.includes(u.role))))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // clear pending debounce on unmount
  useEffect(() => () => clearTimeout(tariffDebounce.current), []);

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
      setSalaryError(err.response?.data?.message || t("pay.salary.error"));
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
      setSalaryError(t("pay.salary.statusError"));
    } finally {
      setCheckingSalaryStatus(false);
    }
  }

  function loadCashClassRoster(classId) {
    setCash((c) => ({ ...c, classId, studentId: "" }));
    if (!classId) return;
    // keep previous roster visible while loading; ignore stale responses
    const id = ++cashRosterReq.current;
    setLoadingCashRoster(true);
    apiClient
      .get(`/api/v1/registrations/class/${classId}`)
      .then((res) => { if (cashRosterReq.current === id) setCashStudents(res.data || []); })
      .catch(() => {})
      .finally(() => { if (cashRosterReq.current === id) setLoadingCashRoster(false); });
  }

  function loadCashFeeSchedules(establishmentId, academicYear) {
    setCash((c) => ({ ...c, establishmentId, classId: "", studentId: "", feeScheduleId: "", amount: "" }));
    if (!establishmentId || !academicYear) return;
    // keep previous schedules visible while loading; ignore stale responses
    const id = ++cashSchedReq.current;
    setLoadingCashSchedules(true);
    apiClient
      .get("/api/v1/admin/fee-schedules", { params: { establishmentId, academicYear } })
      .then((res) => { if (cashSchedReq.current === id) setCashFeeSchedules(res.data || []); })
      .catch(() => {})
      .finally(() => { if (cashSchedReq.current === id) setLoadingCashSchedules(false); });
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
      setCashError(err.response?.data?.message || t("pay.cash.error"));
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
      setCashError(t("pay.cash.receiptError"));
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
      setFeeStatus({ type: "success", text: t("pay.fee.success") });
      setFee((f) => ({ ...EMPTY_FEE, establishmentId: f.establishmentId, academicYear: f.academicYear }));
      if (tariffEstablishmentId === fee.establishmentId) {
        loadTariffs(tariffEstablishmentId, tariffYear);
      }
    } catch (err) {
      setFeeStatus({ type: "error", text: err.response?.data?.message || t("pay.fee.error") });
    } finally {
      setSubmittingFee(false);
    }
  }

  function loadTariffs(establishmentId, academicYear) {
    setTariffEstablishmentId(establishmentId);
    setTariffYear(academicYear);
    if (!establishmentId || !academicYear) return;
    // keep previous tariffs visible while loading; ignore stale responses
    const id = ++tariffReq.current;
    setLoadingTariffs(true);
    apiClient
      .get("/api/v1/admin/fee-schedules", { params: { establishmentId, academicYear } })
      .then((res) => { if (tariffReq.current === id) setTariffs(res.data || []); })
      .catch(() => {})
      .finally(() => { if (tariffReq.current === id) setLoadingTariffs(false); });
  }

  // year is typed char by char: debounce so intermediate values (e.g. "2025-")
  // don't wipe the list with failed requests
  function handleTariffYearChange(value) {
    setTariffYear(value);
    clearTimeout(tariffDebounce.current);
    tariffDebounce.current = setTimeout(() => {
      if (tariffEstablishmentId) loadTariffs(tariffEstablishmentId, value);
    }, 500);
  }

  function classNameById(id) {
    if (!id) return t("pay.fee.field.class.all");
    return classes.find((c) => c.id === id)?.name || id;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t("pay.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("pay.subtitle")}
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">{t("pay.loading")}</p>}
      {error && <Alert variant="error">{t("pay.reportError")}</Alert>}

      {report && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label={t("pay.totalRevenue")}
            value={`${Number(report.totalRevenue ?? 0).toLocaleString("fr-FR")} XAF`}
            icon={Wallet}
            color="emerald"
          />
          <StatCard label={t("pay.transactions")} value={report.transactionCount ?? 0} icon={Receipt} color="blue" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("pay.fee.createTitle")}</CardTitle>
            <CardDescription>
              {t("pay.fee.createSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFeeSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="feeEstablishment">{t("pay.fee.field.school")}</Label>
                <select
                  id="feeEstablishment"
                  value={fee.establishmentId}
                  onChange={(e) => setFee((f) => ({ ...f, establishmentId: e.target.value, classId: "" }))}
                  className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
                  required
                >
                  <option value="">{t("pay.fee.field.school.placeholder")}</option>
                  {establishments.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="feeClass">{t("pay.fee.field.class")}</Label>
                <select
                  id="feeClass"
                  value={fee.classId}
                  onChange={(e) => setFee((f) => ({ ...f, classId: e.target.value }))}
                  className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
                >
                  <option value="">{t("pay.fee.field.class.placeholder")}</option>
                  <option value={NO_CLASS_VALUE}>{t("pay.fee.field.class.all")}</option>
                  {classes
                    .filter((c) => c.establishmentId === fee.establishmentId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feeLabel">{t("pay.fee.field.label")}</Label>
                <Input
                  id="feeLabel"
                  placeholder={t("pay.fee.field.label.placeholder")}
                  value={fee.label}
                  onChange={(e) => setFee((f) => ({ ...f, label: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feeAmount">{t("pay.fee.field.amount")}</Label>
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
                <Label htmlFor="feeYear">{t("pay.fee.field.year")}</Label>
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
                  {submittingFee ? t("pay.fee.creating") : t("pay.fee.create")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("pay.tariffs.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-48 flex-1 space-y-1.5">
                <Label htmlFor="tariffEstablishment">{t("pay.tariffs.field.school")}</Label>
                <select
                  id="tariffEstablishment"
                  value={tariffEstablishmentId}
                  onChange={(e) => loadTariffs(e.target.value, tariffYear)}
                  className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
                >
                  <option value="">{t("pay.fee.field.school.placeholder")}</option>
                  {establishments.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-36 space-y-1.5">
                <Label htmlFor="tariffYear">{t("pay.tariffs.field.year")}</Label>
                <Input
                  id="tariffYear"
                  value={tariffYear}
                  onChange={(e) => handleTariffYearChange(e.target.value)}
                />
              </div>
            </div>

            {loadingTariffs && <p className="text-sm text-muted-foreground">{t("pay.loading")}</p>}
            {tariffs && tariffs.length === 0 && (
              <EmptyState icon={Receipt} message={t("pay.tariffs.empty")} />
            )}
            {tariffs && tariffs.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("pay.tariffs.table.label")}</TableHead>
                    <TableHead>{t("pay.tariffs.table.class")}</TableHead>
                    <TableHead>{t("pay.tariffs.table.amount")}</TableHead>
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
            <CardTitle className="text-base">{t("pay.cash.title")}</CardTitle>
            <CardDescription>
              {t("pay.cash.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCashSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cashEstablishment">{t("pay.cash.field.school")}</Label>
                <select
                  id="cashEstablishment"
                  value={cash.establishmentId}
                  onChange={(e) => loadCashFeeSchedules(e.target.value, cash.academicYear)}
                  className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
                >
                  <option value="">{t("pay.fee.field.school.placeholder")}</option>
                  {establishments.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cashClass">{t("pay.cash.field.class")}</Label>
                <select
                  id="cashClass"
                  value={cash.classId}
                  onChange={(e) => loadCashClassRoster(e.target.value)}
                  disabled={!cash.establishmentId}
                  className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
                >
                  <option value="">{t("pay.cash.field.class.placeholder")}</option>
                  {classes
                    .filter((c) => c.establishmentId === cash.establishmentId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cashStudent">{t("pay.cash.field.student")}</Label>
                <select
                  id="cashStudent"
                  value={cash.studentId}
                  onChange={(e) => setCash((c) => ({ ...c, studentId: e.target.value }))}
                  disabled={!cash.classId}
                  className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
                >
                  <option value="">{t("pay.cash.field.student.placeholder")}</option>
                  {cashStudents.length === 0 && !loadingCashRoster && (
                    <option disabled>{t("pay.cash.empty.students")}</option>
                  )}
                  {cashStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </option>
                  ))}
                </select>
                {loadingCashRoster && <p className="text-xs text-muted-foreground">{t("pay.loading")}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cashTariff">{t("pay.cash.field.tariff")}</Label>
                <select
                  id="cashTariff"
                  value={cash.feeScheduleId}
                  onChange={(e) => {
                    const value = e.target.value;
                    const schedule = cashFeeSchedules.find((f) => f.id === value);
                    setCash((c) => ({ ...c, feeScheduleId: value, amount: schedule ? String(schedule.amount) : c.amount }));
                  }}
                  disabled={!cash.establishmentId}
                  className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
                >
                  <option value="">{t("pay.cash.field.tariff.placeholder")}</option>
                  {cashFeeSchedules.length === 0 && !loadingCashSchedules && (
                    <option disabled>{t("pay.cash.empty.tariffs")}</option>
                  )}
                  {cashFeeSchedules.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label} - {Number(f.amount).toLocaleString("fr-FR")} {f.currency}
                    </option>
                  ))}
                </select>
                {loadingCashSchedules && <p className="text-xs text-muted-foreground">{t("pay.loading")}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cashAmount">{t("pay.cash.field.amount")}</Label>
                <Input
                  id="cashAmount"
                  type="number"
                  min="1"
                  value={cash.amount}
                  onChange={(e) => setCash((c) => ({ ...c, amount: e.target.value }))}
                  disabled={!cash.feeScheduleId}
                  required
                />
                <p className="text-xs text-muted-foreground">{t("pay.cash.field.amount.hint")}</p>
              </div>
              {cashError && (
                <Alert variant="error" className="sm:col-span-2">
                  {cashError}
                </Alert>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submittingCash || !cash.studentId || !cash.feeScheduleId}>
                  {submittingCash ? t("pay.cash.submitting") : t("pay.cash.submit")}
                </Button>
              </div>
            </form>

            {cashTransaction && (
              <div className="mt-4 space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    {t("pay.cash.transaction")} <span className="font-mono">{cashTransaction.id}</span>
                  </span>
                  <Badge variant={statusOf(PAYMENT_STATUS, cashTransaction.status).variant}>
                    {statusOf(PAYMENT_STATUS, cashTransaction.status).label}
                  </Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleDownloadCashReceipt(cashTransaction.id)}>
                  {t("pay.cash.receipt")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="text-base">{t("pay.salary.title")}</CardTitle>
            <CardDescription>{t("pay.salary.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSalarySubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="salaryStaff">{t("pay.salary.field.staff")}</Label>
                <Select
                  value={salary.staffUserId}
                  onValueChange={(value) => setSalary((s) => ({ ...s, staffUserId: value }))}
                >
                  <SelectTrigger id="salaryStaff" className="w-full">
                    <SelectValue placeholder={t("pay.salary.field.staff.placeholder")} />
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
                <Label htmlFor="salaryEstablishment">{t("pay.salary.field.school")}</Label>
                <select
                  id="salaryEstablishment"
                  value={salary.establishmentId}
                  onChange={(e) => setSalary((s) => ({ ...s, establishmentId: e.target.value }))}
                  className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
                >
                  <option value="">{t("pay.fee.field.school.placeholder")}</option>
                  {establishments.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="salaryAmount">{t("pay.salary.field.amount")}</Label>
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
                <Label htmlFor="salaryProvider">{t("pay.salary.field.provider")}</Label>
                <Select value={salary.provider} onValueChange={(value) => setSalary((s) => ({ ...s, provider: value }))}>
                  <SelectTrigger id="salaryProvider" className="w-full">
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
                <Label htmlFor="salaryPhone">{t("pay.salary.field.phone")}</Label>
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
                  {submittingSalary ? t("pay.salary.submitting") : t("pay.salary.submit")}
                </Button>
              </div>
            </form>

            {salaryTransaction && (
              <div className="mt-4 space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    {t("pay.cash.transaction")} <span className="font-mono">{salaryTransaction.id}</span>
                  </span>
                  <Badge variant={statusOf(PAYMENT_STATUS, salaryTransaction.status).variant}>
                    {statusOf(PAYMENT_STATUS, salaryTransaction.status).label}
                  </Badge>
                </div>
                {salaryTransaction.failureReason && (
                  <p className="text-destructive">{salaryTransaction.failureReason}</p>
                )}
                <Button size="sm" variant="outline" disabled={checkingSalaryStatus} onClick={handleCheckSalaryStatus}>
                  {checkingSalaryStatus ? "..." : t("pay.salary.refresh")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
