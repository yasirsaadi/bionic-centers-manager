import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ArrowRight, UserPlus, Users, Banknote } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import type { Branch, Patient } from "@shared/schema";

export default function BranchDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const branchId = Number(id);

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch branches");
      return res.json();
    },
  });

  const { data: allPatients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const res = await fetch("/api/patients", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch patients");
      return res.json();
    },
  });

  const branch = branches?.find(b => b.id === branchId);
  const patients = allPatients?.filter(p => p.branchId === branchId) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const totalCost = patients.reduce((acc, p) => acc + (p.totalCost || 0), 0);
  const amputeeCount = patients.filter(p => p.isAmputee).length;
  const physioCount = patients.filter(p => p.isPhysiotherapy).length;

  return (
    <AdminGate>
    <div className="space-y-6 page-transition py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => setLocation("/branches")} className="p-2">
          <ArrowRight className="w-5 h-5 text-slate-500" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-800">
              فرع {branch?.name || "..."}
            </h2>
            <p className="text-muted-foreground">إدارة مرضى الفرع</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{patients.length}</p>
              <p className="text-sm text-muted-foreground">إجمالي المرضى</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{amputeeCount}</p>
              <p className="text-sm text-muted-foreground">حالات بتر</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{physioCount}</p>
              <p className="text-sm text-muted-foreground">علاج طبيعي</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalCost.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">إجمالي التكاليف (د.ع)</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800">مرضى الفرع</h3>
        <Button onClick={() => setLocation(`/patients/new?branch=${branchId}`)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          إضافة مريض للفرع
        </Button>
      </div>

      {patients.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-2">لا يوجد مرضى في هذا الفرع</h3>
          <p className="text-muted-foreground mb-4">ابدأ بإضافة مريض جديد</p>
          <Button onClick={() => setLocation(`/patients/new?branch=${branchId}`)}>
            <UserPlus className="w-4 h-4 ml-2" />
            إضافة مريض
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {patients.map((patient) => (
            <Link key={patient.id} href={`/patients/${patient.id}`}>
              <Card className="p-4 rounded-xl hover-elevate cursor-pointer transition-all" data-testid={`card-patient-${patient.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {patient.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800">{patient.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {patient.age} سنة - {patient.medicalCondition}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={patient.isAmputee ? "default" : "secondary"}>
                      {patient.isAmputee ? "بتر" : "علاج طبيعي"}
                    </Badge>
                    <span className="text-sm font-mono text-muted-foreground">
                      {(patient.totalCost || 0).toLocaleString()} د.ع
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
    </AdminGate>
  );
}
