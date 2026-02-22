import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardCheck, Send, BarChart3, Users, TrendingUp, Search, Eye, Calendar } from "lucide-react";
import { useState, useMemo } from "react";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useBranchSession } from "@/components/BranchGate";
import { formatDateIraq } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import type { Patient, Branch, SurveyTemplate, SurveyQuestion, SurveyResponse, SurveyAnswer } from "@shared/schema";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const CATEGORY_MAP: Record<string, string> = {
  comfort: "comfort",
  function: "function",
  appearance: "appearance",
  durability: "durability",
  service: "service",
  pain: "pain",
  overall: "overall",
  treatment: "treatment",
  therapist: "therapist",
  communication: "communication",
  equipment: "equipment",
  environment: "environment",
  scheduling: "scheduling",
  results: "results_section",
  reception: "reception",
  waiting: "waiting",
  cleanliness: "cleanliness",
  facilities: "facilities",
};

function NumberRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const getColor = (num: number) => {
    if (num <= 3) return "bg-red-100 text-red-700 border-red-300";
    if (num <= 5) return "bg-orange-100 text-orange-700 border-orange-300";
    if (num <= 7) return "bg-yellow-100 text-yellow-700 border-yellow-300";
    if (num <= 9) return "bg-green-100 text-green-700 border-green-300";
    return "bg-emerald-100 text-emerald-700 border-emerald-300";
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
        <button
          key={num}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(num)}
          className={`w-8 h-8 rounded-md border text-sm font-bold transition-all ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          } ${
            num === value
              ? `${getColor(num)} ring-2 ring-offset-1 ring-primary`
              : num <= value && value > 0
              ? getColor(num)
              : "bg-muted/30 text-muted-foreground border-muted"
          }`}
          data-testid={`number-rating-${num}`}
        >
          {num}
        </button>
      ))}
      {value > 0 && (
        <span className="text-xs text-muted-foreground mr-2 font-medium">{value}/10</span>
      )}
    </div>
  );
}

function AddSurveyTab() {
  const { t, dir } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const branchSession = useBranchSession();
  const isAdmin = branchSession?.isAdmin ?? false;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");

  const { data: patients, isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: templates } = useQuery<SurveyTemplate[]>({
    queryKey: ["/api/survey-templates"],
  });

  const { data: questions } = useQuery<SurveyQuestion[]>({
    queryKey: ["/api/survey-templates", selectedTemplateId, "questions"],
    queryFn: async () => {
      if (!selectedTemplateId) return [];
      const res = await fetch(`/api/survey-templates/${selectedTemplateId}/questions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!selectedTemplateId,
  });

  const filteredPatients = useMemo(() => {
    if (!patients) return [];
    let filtered = patients;
    if (!isAdmin && branchSession?.branchId) {
      filtered = filtered.filter(p => p.branchId === branchSession.branchId);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) || (p.phone && p.phone.includes(term))
      );
    }
    return filtered.slice(0, 50);
  }, [patients, searchTerm, branchSession, isAdmin]);

  const selectedPatient = useMemo(() => {
    if (!selectedPatientId || !patients) return null;
    return patients.find(p => p.id === selectedPatientId) || null;
  }, [selectedPatientId, patients]);

  const availableTemplates = useMemo(() => {
    if (!templates || !selectedPatient) return [];
    const result: SurveyTemplate[] = [];
    if (selectedPatient.isAmputee) {
      const t = templates.find(t => t.targetType === "prosthetics");
      if (t) result.push(t);
    }
    if (selectedPatient.isPhysiotherapy) {
      const t = templates.find(t => t.targetType === "physiotherapy");
      if (t) result.push(t);
    }
    const general = templates.find(t => t.targetType === "general");
    if (general) result.push(general);
    if (selectedPatient.isMedicalSupport && result.length === (general ? 1 : 0)) {
      if (general && !result.includes(general)) result.push(general);
    }
    return result;
  }, [templates, selectedPatient]);

  const groupedQuestions = useMemo(() => {
    if (!questions) return {};
    const groups: Record<string, SurveyQuestion[]> = {};
    for (const q of questions) {
      const cat = q.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(q);
    }
    return groups;
  }, [questions]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const answersList = Object.entries(answers).map(([qId, rating]) => ({
        questionId: Number(qId),
        ratingValue: rating,
      }));
      return await apiRequest("POST", "/api/survey-responses", {
        templateId: selectedTemplateId,
        patientId: selectedPatientId,
        branchId: selectedPatient?.branchId || branchSession?.branchId,
        answers: answersList,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: t.surveys.submitSuccess });
      queryClient.invalidateQueries({ queryKey: ["/api/survey-responses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/survey-results"] });
      setSelectedPatientId(null);
      setSelectedTemplateId(null);
      setAnswers({});
      setNotes("");
      setSearchTerm("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit survey", variant: "destructive" });
    },
  });

  const handlePatientSelect = (patientId: number) => {
    setSelectedPatientId(patientId);
    setSelectedTemplateId(null);
    setAnswers({});
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(Number(templateId));
    setAnswers({});
  };

  const allQuestionsAnswered = useMemo(() => {
    if (!questions) return false;
    const ratingQuestions = questions.filter(q => q.questionType === "rating");
    return ratingQuestions.every(q => answers[q.id] && answers[q.id] > 0);
  }, [questions, answers]);

  const getCategoryLabel = (cat: string) => {
    const key = CATEGORY_MAP[cat] || cat;
    return (t.surveys as any)[key] || cat;
  };

  return (
    <div className="space-y-6" dir={dir}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-lg">{t.surveys.selectPatient}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t.surveys.searchPatient}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-9"
              data-testid="input-search-patient"
            />
          </div>

          {patientsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => handlePatientSelect(patient.id)}
                  className={`w-full flex items-center justify-between gap-2 p-3 rounded-md text-sm transition-colors ${
                    selectedPatientId === patient.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover-elevate"
                  }`}
                  data-testid={`btn-select-patient-${patient.id}`}
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="font-medium">{patient.name}</span>
                    <span className="text-xs text-muted-foreground">{patient.phone}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {patient.isAmputee && <Badge variant="secondary" className="text-xs">{t.surveys.prosthetics}</Badge>}
                    {patient.isPhysiotherapy && <Badge variant="secondary" className="text-xs">{t.surveys.physiotherapy}</Badge>}
                    {patient.isMedicalSupport && <Badge variant="secondary" className="text-xs">{t.surveys.general}</Badge>}
                  </div>
                </button>
              ))}
              {filteredPatients.length === 0 && (
                <p className="text-center text-muted-foreground py-4">{t.patients.noPatientsFound}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPatient && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-lg">{t.surveys.surveyType}</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedTemplateId?.toString() || ""} onValueChange={handleTemplateSelect}>
              <SelectTrigger data-testid="select-survey-template">
                <SelectValue placeholder={t.surveys.surveyType} />
              </SelectTrigger>
              <SelectContent>
                {availableTemplates.map((tmpl) => (
                  <SelectItem key={tmpl.id} value={tmpl.id.toString()}>
                    {tmpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {selectedTemplateId && questions && questions.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-lg">{t.surveys.questions}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(groupedQuestions).map(([category, catQuestions]) => (
              <div key={category} className="space-y-3">
                <h3 className="font-semibold text-sm text-primary border-b pb-1">
                  {getCategoryLabel(category)}
                </h3>
                {catQuestions.map((q) => (
                  <div key={q.id} className="space-y-2 p-3 rounded-md bg-muted/30">
                    <p className="text-sm font-medium">{q.questionText}</p>
                    {q.questionTextEn && (
                      <p className="text-xs text-muted-foreground">{q.questionTextEn}</p>
                    )}
                    {q.questionType === "rating" && (
                      <NumberRating
                        value={answers[q.id] || 0}
                        onChange={(v) => setAnswers(prev => ({ ...prev, [q.id]: v }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}

            <div className="space-y-2">
              <label className="text-sm font-medium">{t.surveys.notes}</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                data-testid="input-survey-notes"
              />
            </div>

            <Button
              onClick={() => submitMutation.mutate()}
              disabled={!allQuestionsAnswered || submitMutation.isPending}
              className="w-full"
              data-testid="btn-submit-survey"
            >
              <Send className="w-4 h-4 me-2" />
              {submitMutation.isPending ? "..." : t.surveys.submit}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ResultsTab() {
  const { t, dir, language } = useTranslation();
  const branchSession = useBranchSession();
  const isAdmin = branchSession?.isAdmin ?? false;
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [viewResponseId, setViewResponseId] = useState<number | null>(null);

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: templates } = useQuery<SurveyTemplate[]>({
    queryKey: ["/api/survey-templates"],
  });

  const branchIdParam = selectedBranch !== "all" ? `?branchId=${selectedBranch}` : "";
  const { data: responses, isLoading } = useQuery<SurveyResponse[]>({
    queryKey: ["/api/survey-responses", selectedBranch],
    queryFn: async () => {
      const res = await fetch(`/api/survey-responses${branchIdParam}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: patients } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
  });

  const { data: viewAnswers } = useQuery<SurveyAnswer[]>({
    queryKey: ["/api/survey-responses", viewResponseId, "answers"],
    queryFn: async () => {
      if (!viewResponseId) return [];
      const res = await fetch(`/api/survey-responses/${viewResponseId}/answers`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!viewResponseId,
  });

  const viewResponse = responses?.find(r => r.id === viewResponseId);
  const viewTemplate = viewResponse ? templates?.find(t => t.id === viewResponse.templateId) : null;

  const { data: viewQuestions } = useQuery<SurveyQuestion[]>({
    queryKey: ["/api/survey-templates", viewTemplate?.id, "questions"],
    queryFn: async () => {
      if (!viewTemplate?.id) return [];
      const res = await fetch(`/api/survey-templates/${viewTemplate.id}/questions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!viewTemplate?.id,
  });

  const stats = useMemo(() => {
    if (!responses) return { total: 0, avgSatisfaction: 0, thisMonth: 0 };
    const total = responses.length;
    const avgSatisfaction = total > 0
      ? Math.round(responses.reduce((sum, r) => sum + (r.percentage || 0), 0) / total)
      : 0;
    const now = new Date();
    const thisMonth = responses.filter(r => {
      const d = new Date(r.completedAt || "");
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total, avgSatisfaction, thisMonth };
  }, [responses]);

  const branchChartData = useMemo(() => {
    if (!responses || !branches) return [];
    return branches.map(branch => {
      const branchResponses = responses.filter(r => r.branchId === branch.id);
      const avg = branchResponses.length > 0
        ? Math.round(branchResponses.reduce((s, r) => s + (r.percentage || 0), 0) / branchResponses.length)
        : 0;
      return { name: branch.name, value: avg, count: branchResponses.length };
    }).filter(b => b.count > 0);
  }, [responses, branches]);

  const deptChartData = useMemo(() => {
    if (!responses || !templates) return [];
    return templates.map((tmpl, i) => {
      const tmplResponses = responses.filter(r => r.templateId === tmpl.id);
      const avg = tmplResponses.length > 0
        ? Math.round(tmplResponses.reduce((s, r) => s + (r.percentage || 0), 0) / tmplResponses.length)
        : 0;
      return { name: tmpl.name, value: avg, count: tmplResponses.length, color: COLORS[i % COLORS.length] };
    }).filter(d => d.count > 0);
  }, [responses, templates]);

  const getPatientName = (patientId: number) => {
    return patients?.find(p => p.id === patientId)?.name || `#${patientId}`;
  };

  const getTemplateName = (templateId: number) => {
    return templates?.find(t => t.id === templateId)?.name || "";
  };

  const getBranchName = (branchId: number) => {
    const name = branches?.find(b => b.id === branchId)?.name || "";
    return (t.branches as any)[name] || name;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={dir}>
      {isAdmin && (
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-48" data-testid="select-branch-filter">
              <SelectValue placeholder={t.surveys.filterByBranch} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.surveys.allBranches}</SelectItem>
              {branches?.map(b => (
                <SelectItem key={b.id} value={b.id.toString()}>
                  {(t.branches as any)[b.name] || b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">{t.surveys.totalSurveys}</CardTitle>
            <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-total-surveys">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">{t.surveys.avgSatisfaction}</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-avg-satisfaction">{stats.avgSatisfaction}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">{t.surveys.thisMonth}</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-this-month">{stats.thisMonth}</p>
          </CardContent>
        </Card>
      </div>

      {branchChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t.surveys.branchComparison}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={branchChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: number) => [`${value}%`, t.surveys.avgSatisfaction]} />
                <Bar dataKey="value" fill="#0088FE" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {deptChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t.surveys.departmentComparison}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deptChartData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {deptChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, t.surveys.avgSatisfaction]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t.surveys.recentSurveys}</CardTitle>
        </CardHeader>
        <CardContent>
          {!responses || responses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">{t.surveys.noSurveys}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-start p-2 font-medium">{t.surveys.patientName}</th>
                    <th className="text-start p-2 font-medium">{t.surveys.templateName}</th>
                    <th className="text-start p-2 font-medium">{t.surveys.score}</th>
                    <th className="text-start p-2 font-medium">{t.surveys.branch}</th>
                    <th className="text-start p-2 font-medium">{t.surveys.date}</th>
                    <th className="text-start p-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {responses.slice(0, 20).map((resp) => (
                    <tr key={resp.id} className="border-b last:border-0">
                      <td className="p-2" data-testid={`text-patient-${resp.id}`}>{getPatientName(resp.patientId)}</td>
                      <td className="p-2">{getTemplateName(resp.templateId)}</td>
                      <td className="p-2">
                        <Badge
                          variant={resp.percentage && resp.percentage >= 80 ? "default" : resp.percentage && resp.percentage >= 60 ? "secondary" : "destructive"}
                          data-testid={`badge-score-${resp.id}`}
                        >
                          {resp.percentage}%
                        </Badge>
                      </td>
                      <td className="p-2">{getBranchName(resp.branchId)}</td>
                      <td className="p-2 text-muted-foreground">{formatDateIraq(resp.completedAt)}</td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewResponseId(resp.id)}
                          data-testid={`btn-view-survey-${resp.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewResponseId} onOpenChange={() => setViewResponseId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.surveys.surveyDetails}</DialogTitle>
          </DialogHeader>
          {viewResponse && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">{t.surveys.patientName}:</span>
                  <p className="font-medium">{getPatientName(viewResponse.patientId)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.surveys.score}:</span>
                  <p className="font-medium">{viewResponse.percentage}% ({viewResponse.totalScore}/{viewResponse.maxScore})</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.surveys.branch}:</span>
                  <p className="font-medium">{getBranchName(viewResponse.branchId)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.surveys.date}:</span>
                  <p className="font-medium">{formatDateIraq(viewResponse.completedAt)}</p>
                </div>
              </div>
              {viewResponse.notes && (
                <div>
                  <span className="text-sm text-muted-foreground">{t.surveys.notes}:</span>
                  <p className="text-sm">{viewResponse.notes}</p>
                </div>
              )}
              {viewQuestions && viewAnswers && (
                <div className="space-y-3 border-t pt-3">
                  {viewQuestions.map((q) => {
                    const answer = viewAnswers.find(a => a.questionId === q.id);
                    return (
                      <div key={q.id} className="space-y-1">
                        <p className="text-sm font-medium">{q.questionText}</p>
                        {q.questionType === "rating" && answer && (
                          <NumberRating value={answer.ratingValue || 0} readonly />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Surveys() {
  const { t, dir } = useTranslation();

  return (
    <div dir={dir}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" data-testid="text-surveys-title">{t.surveys.title}</h1>
        <p className="text-muted-foreground">{t.surveys.subtitle}</p>
      </div>

      <Tabs defaultValue="add" dir={dir}>
        <TabsList className="mb-4">
          <TabsTrigger value="add" data-testid="tab-add-survey">{t.surveys.addSurvey}</TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-survey-results">{t.surveys.results}</TabsTrigger>
        </TabsList>
        <TabsContent value="add">
          <AddSurveyTab />
        </TabsContent>
        <TabsContent value="results">
          <ResultsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}