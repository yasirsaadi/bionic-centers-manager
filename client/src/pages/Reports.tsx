import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Banknote, Clock, Building2, Calendar, Users, ChevronDown, ChevronUp, UserPlus, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "@shared/routes";
import type { Branch } from "@shared/schema";
import { useBranchSession } from "@/components/BranchGate";
import { formatDateIraq, formatTimeIraq, getTodayIraq } from "@/lib/utils";
import { useTranslation } from "@/i18n/LanguageContext";

interface PaymentDetail {
  id: number;
  patientId: number;
  patientName: string;
  amount: number;
  notes: string | null;
  paymentTreatmentType: string | null;
  date: string;
  patientTotalCost: number;
}

interface PatientDetail {
  id: number;
  name: string;
  totalCost: number;
  isAmputee: boolean;
  isPhysiotherapy: boolean;
  isMedicalSupport: boolean;
  createdAt: string;
  visitReason: string | null;
}

interface DailySummary {
  date: string;
  payments: PaymentDetail[];
  patients: PatientDetail[];
  totalPaid: number;
  totalCosts: number;
  patientCount: number;
  paymentCount: number;
}

interface DetailedReport {
  branchId: number;
  dailySummaries: DailySummary[];
  overall: {
    totalCost: number;
    totalPaid: number;
    remaining: number;
    totalPatients: number;
    totalPayments: number;
  };
}

function isToday(dateStr: string): boolean {
  return dateStr === getTodayIraq();
}

function DaySummaryCard({ summary, isExpanded, onToggle }: { 
  summary: DailySummary; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const dir = t.dir;
  const locale = dir === "rtl" ? "ar-IQ" : "en-US";
  const dateLocale = dir === "rtl" ? "ar-IQ" : "en-GB";
  const isTodayDate = isToday(summary.date);

  function formatDateLong(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString(dateLocale, {
      timeZone: 'Asia/Baghdad',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  return (
    <Card className={`rounded-2xl overflow-hidden border-border/60 ${isTodayDate ? 'border-2 border-primary/50 shadow-lg' : ''}`}>
      <div 
        className={`p-5 cursor-pointer ${isTodayDate ? 'bg-primary/5' : 'bg-white'}`}
        onClick={onToggle}
        data-testid={`day-summary-${summary.date}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isTodayDate ? 'bg-primary/20' : 'bg-slate-100'}`}>
              <Calendar className={`w-6 h-6 ${isTodayDate ? 'text-primary' : 'text-slate-600'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-800">
                  {isTodayDate ? t.reports.today : formatDateLong(summary.date)}
                </h3>
                {isTodayDate && (
                  <Badge variant="default" className="bg-primary text-white">
                    {formatDateIraq(new Date())}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <UserPlus className="w-4 h-4" />
                  {summary.patientCount} {t.reports.newPatient}
                </span>
                <span className="flex items-center gap-1">
                  <CreditCard className="w-4 h-4" />
                  {summary.paymentCount} {t.reports.paymentOp}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className={dir === "rtl" ? "text-left" : "text-right"}>
              <p className="text-xs text-muted-foreground">{t.reports.costs}</p>
              <p className="font-bold font-mono text-slate-800">{summary.totalCosts.toLocaleString(locale)} {t.reports.currency}</p>
            </div>
            <div className={dir === "rtl" ? "text-left" : "text-right"}>
              <p className="text-xs text-muted-foreground">{t.reports.paid}</p>
              <p className="font-bold font-mono text-emerald-600">{summary.totalPaid.toLocaleString(locale)} {t.reports.currency}</p>
            </div>
            <div className={dir === "rtl" ? "text-left" : "text-right"}>
              <p className="text-xs text-muted-foreground">{t.reports.remaining}</p>
              <p className="font-bold font-mono text-red-600">
                {(summary.totalCosts - summary.totalPaid).toLocaleString(locale)} {t.reports.currency}
              </p>
            </div>
            <Button variant="ghost" size="icon" className={dir === "rtl" ? "mr-2" : "ml-2"}>
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t bg-slate-50/50 p-5 space-y-6">
          {summary.patients.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                {t.reports.registeredPatients} ({summary.patients.length})
              </h4>
              <div className="overflow-hidden border rounded-xl bg-white">
                <table className="w-full">
                  <thead className="bg-blue-50/80">
                    <tr>
                      <th className={`${dir === "rtl" ? "text-right" : "text-left"} p-3 font-semibold text-slate-600 text-sm`}>#</th>
                      <th className={`${dir === "rtl" ? "text-right" : "text-left"} p-3 font-semibold text-slate-600 text-sm`}>{t.reports.patientName}</th>
                      <th className={`${dir === "rtl" ? "text-right" : "text-left"} p-3 font-semibold text-slate-600 text-sm`}>{t.reports.conditionType}</th>
                      <th className={`${dir === "rtl" ? "text-right" : "text-left"} p-3 font-semibold text-slate-600 text-sm`}>{t.reports.visitReason}</th>
                      <th className={`${dir === "rtl" ? "text-left" : "text-right"} p-3 font-semibold text-slate-600 text-sm`}>{t.reports.costCurrency}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {summary.patients.map((patient, idx) => (
                      <tr key={patient.id} className="hover:bg-slate-50/50">
                        <td className="p-3 text-sm text-muted-foreground">{idx + 1}</td>
                        <td className="p-3 font-medium text-slate-800">{patient.name}</td>
                        <td className="p-3">
                          <Badge variant={patient.isAmputee ? "default" : patient.isMedicalSupport ? "outline" : "secondary"}>
                            {patient.isAmputee ? t.reports.amputee : patient.isMedicalSupport ? t.reports.medicalSupport : t.reports.physiotherapy}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm text-slate-700">{patient.visitReason || '-'}</td>
                        <td className={`p-3 ${dir === "rtl" ? "text-left" : "text-right"} font-mono font-bold text-slate-800`}>
                          {patient.totalCost.toLocaleString(locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-blue-50/80">
                    <tr>
                      <td colSpan={4} className="p-3 font-bold text-slate-700">{t.reports.dayCostTotal}</td>
                      <td className={`p-3 ${dir === "rtl" ? "text-left" : "text-right"} font-mono font-bold text-slate-800`}>
                        {summary.totalCosts.toLocaleString(locale)} {t.reports.currency}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          
          {summary.payments.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                {t.reports.payments} ({summary.payments.length})
              </h4>
              <div className="overflow-hidden border rounded-xl bg-white">
                <table className="w-full">
                  <thead className="bg-emerald-50/80">
                    <tr>
                      <th className={`${dir === "rtl" ? "text-right" : "text-left"} p-3 font-semibold text-slate-600 text-sm`}>#</th>
                      <th className={`${dir === "rtl" ? "text-right" : "text-left"} p-3 font-semibold text-slate-600 text-sm`}>{t.reports.patientName}</th>
                      <th className={`${dir === "rtl" ? "text-right" : "text-left"} p-3 font-semibold text-slate-600 text-sm`}>{t.reports.time}</th>
                      <th className={`${dir === "rtl" ? "text-right" : "text-left"} p-3 font-semibold text-slate-600 text-sm`}>{t.reports.treatmentType}</th>
                      <th className={`${dir === "rtl" ? "text-right" : "text-left"} p-3 font-semibold text-slate-600 text-sm`}>{t.reports.notes}</th>
                      <th className={`${dir === "rtl" ? "text-left" : "text-right"} p-3 font-semibold text-slate-600 text-sm`}>{t.reports.amountCurrency}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {summary.payments.map((payment, idx) => {
                      const paymentTime = payment.date ? formatTimeIraq(payment.date) : '-';
                      return (
                        <tr key={payment.id} className="hover:bg-slate-50/50">
                          <td className="p-3 text-sm text-muted-foreground">{idx + 1}</td>
                          <td className="p-3 font-medium text-slate-800">{payment.patientName}</td>
                          <td className="p-3 text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {paymentTime}
                          </td>
                          <td className="p-3 text-sm">
                            {payment.paymentTreatmentType 
                              ? <span className="inline-block bg-blue-50 text-blue-700 rounded px-2 py-0.5 text-xs">{payment.paymentTreatmentType}</span>
                              : <span className="text-muted-foreground">-</span>
                            }
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">{payment.notes || '-'}</td>
                          <td className={`p-3 ${dir === "rtl" ? "text-left" : "text-right"} font-mono font-bold text-emerald-600`}>
                            {payment.amount.toLocaleString(locale)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-emerald-50/80">
                    <tr>
                      <td colSpan={5} className="p-3 font-bold text-slate-700">{t.reports.paymentsTotal}</td>
                      <td className={`p-3 ${dir === "rtl" ? "text-left" : "text-right"} font-mono font-bold text-emerald-600`}>
                        {summary.totalPaid.toLocaleString(locale)} {t.reports.currency}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
          
          {summary.patients.length === 0 && summary.payments.length === 0 && (
            <p className="text-center text-muted-foreground py-4">{t.reports.noOpsToday}</p>
          )}
        </div>
      )}
    </Card>
  );
}

function ReportsContent() {
  const branchSession = useBranchSession();
  const isAdmin = branchSession?.isAdmin || false;
  const userBranchId = branchSession?.branchId;
  const { t } = useTranslation();
  const dir = t.dir;
  const locale = dir === "rtl" ? "ar-IQ" : "en-US";
  
  const [selectedBranch, setSelectedBranch] = useState<string>(
    isAdmin ? "1" : (userBranchId?.toString() || "1")
  );
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  
  const effectiveBranchFilter = isAdmin ? selectedBranch : (userBranchId?.toString() || "1");

  const { data: branches } = useQuery<Branch[]>({
    queryKey: [api.branches.list.path],
    queryFn: async () => {
      const res = await fetch(api.branches.list.path, { credentials: "include" });
      if (!res.ok) throw new Error(t.reports.fetchBranchesError);
      return res.json();
    },
  });

  // Windowed report: load only the last N days of the daily log (the header
  // totals are always whole-history). Keeps the page fast as data grows.
  const [reportDays, setReportDays] = useState(45);

  const { data: report, isLoading } = useQuery<DetailedReport>({
    queryKey: ["/api/reports/detailed", effectiveBranchFilter, reportDays],
    queryFn: async () => {
      const res = await fetch(`/api/reports/detailed/${effectiveBranchFilter}?days=${reportDays}`, {
        credentials: "include"
      });
      if (!res.ok) throw new Error(t.reports.fetchReportError);
      return res.json();
    },
  });

  const rawBranchName = branches?.find(b => b.id.toString() === effectiveBranchFilter)?.name || "";
  const selectedBranchName = rawBranchName 
    ? ((t.branches as Record<string, string>)[rawBranchName] || rawBranchName) 
    : t.reports.branchFallback;

  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (report?.dailySummaries) {
      const todaySummary = report.dailySummaries.find(s => isToday(s.date));
      if (todaySummary) {
        setExpandedDays(prev => {
          if (!prev.has(todaySummary.date)) {
            return new Set([todaySummary.date]);
          }
          return prev;
        });
      }
    }
  }, [report?.dailySummaries]);

  return (
    <div className="space-y-6 md:space-y-8 page-transition">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-slate-800">{t.reports.title}</h2>
          <p className="text-sm md:text-base text-muted-foreground mt-1">{t.reports.subtitle} {selectedBranchName}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {isAdmin ? (
            <>
              <Building2 className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground hidden sm:block" />
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-36 md:w-48 h-10 md:h-11 text-sm md:text-base" data-testid="select-branch">
                  <SelectValue placeholder={t.reports.selectBranch} />
                </SelectTrigger>
                <SelectContent>
                  {branches?.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {(t.branches as Record<string, string>)[branch.name] || branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <Badge variant="secondary" className="text-sm px-3 py-1" data-testid="badge-branch">
              <Building2 className={`w-4 h-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
              {selectedBranchName}
            </Badge>
          )}
          <Button variant="outline" className="gap-2 print:hidden h-10 md:h-11 text-sm md:text-base" onClick={() => window.print()} data-testid="button-print-report">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">{t.reports.print}</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="p-3 md:p-5 rounded-xl md:rounded-2xl border-border/60 shadow-sm">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <Banknote className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{t.reports.totalCosts}</p>
                  <p className="text-xl font-bold text-slate-900" data-testid="text-total-cost">
                    {(report?.overall?.totalCost || 0).toLocaleString(locale)} {t.reports.currency}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border-border/60 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.reports.paidAmount}</p>
                  <p className="text-xl font-bold text-emerald-600" data-testid="text-total-paid">
                    {(report?.overall?.totalPaid || 0).toLocaleString(locale)} {t.reports.currency}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border-border/60 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.reports.remainingAmount}</p>
                  <p className="text-xl font-bold text-red-600" data-testid="text-remaining">
                    {(report?.overall?.remaining || 0).toLocaleString(locale)} {t.reports.currency}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5 rounded-2xl border-border/60 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.reports.patientCount}</p>
                  <p className="text-xl font-bold text-slate-900" data-testid="text-patients">
                    {report?.overall?.totalPatients || 0}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {t.reports.dailyLog}
              </h3>
              <select
                value={reportDays}
                onChange={(e) => setReportDays(Number(e.target.value))}
                className="p-2 border rounded-md text-sm bg-background"
                data-testid="select-report-days"
              >
                <option value={45}>آخر 45 يوماً</option>
                <option value={90}>آخر 90 يوماً</option>
                <option value={180}>آخر 180 يوماً</option>
                <option value={0}>كل الفترة</option>
              </select>
            </div>
            
            {report?.dailySummaries && report.dailySummaries.length > 0 ? (
              <div className="space-y-3">
                {report.dailySummaries.map((summary) => (
                  <DaySummaryCard 
                    key={summary.date}
                    summary={summary}
                    isExpanded={expandedDays.has(summary.date)}
                    onToggle={() => toggleDay(summary.date)}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center rounded-2xl">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">{t.reports.noFinancialOps}</h3>
                <p className="text-muted-foreground">{t.reports.noOpsInBranch}</p>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function Reports() {
  return <ReportsContent />;
}
