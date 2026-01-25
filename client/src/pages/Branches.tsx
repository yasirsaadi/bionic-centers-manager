import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Users, ArrowLeft, Search, Eye, X } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import { useState, useMemo } from "react";
import type { Branch, Patient, Visit } from "@shared/schema";

type PatientWithVisits = Patient & { visits?: Visit[] };

export default function Branches() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: branches, isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  const { data: allPatients } = useQuery<PatientWithVisits[]>({
    queryKey: ["/api/patients"],
    queryFn: async () => {
      const res = await fetch("/api/patients", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch patients");
      return res.json();
    },
  });

  const getBranchName = (branchId: number) => {
    return branches?.find(b => b.id === branchId)?.name || "-";
  };

  const searchResults = useMemo(() => {
    if (!searchTerm.trim() || !allPatients) return [];
    const term = searchTerm.toLowerCase();
    return allPatients.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.phone?.includes(term)
    ).slice(0, 10);
  }, [searchTerm, allPatients]);

  const showSearchResults = searchTerm.trim().length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <AdminGate>
    <div className="space-y-4 md:space-y-6 page-transition py-2 md:py-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-slate-800">الفروع</h2>
          <p className="text-xs md:text-base text-muted-foreground">فروع مركز بايونك في العراق</p>
        </div>
        <Badge variant="secondary" className="text-xs md:text-sm px-2 md:px-3 py-1 shrink-0">
          {branches?.length || 0} فروع
        </Badge>
      </div>

      {/* Global Patient Search */}
      <div className="bg-white rounded-xl border border-border shadow-sm p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="بحث عن مريض باسمه أو رقم هاتفه في جميع الفروع..." 
            className="pr-11 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-colors text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-all-patients"
          />
          {searchTerm && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setSearchTerm("")}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Search Results */}
        {showSearchResults && (
          <div className="mt-3 border-t pt-3">
            {searchResults.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>لا يوجد نتائج مطابقة لـ "{searchTerm}"</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground mb-2">
                  تم العثور على {searchResults.length} نتيجة
                </p>
                {searchResults.map((patient) => (
                  <Link key={patient.id} href={`/patients/${patient.id}`}>
                    <Card className="overflow-hidden hover-elevate cursor-pointer">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                              {patient.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">{patient.name}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{patient.age} سنة</span>
                                <span className="text-slate-300">|</span>
                                <div className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  <span>{getBranchName(patient.branchId)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={patient.isAmputee ? "default" : patient.isMedicalSupport ? "outline" : "secondary"} className="font-normal text-xs">
                              {patient.isAmputee ? "بتر" : patient.isMedicalSupport ? "مساند طبية" : "علاج طبيعي"}
                            </Badge>
                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 gap-1 h-8 text-xs">
                              <Eye className="w-3.5 h-3.5" />
                              عرض
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {branches?.map((branch) => (
          <Card 
            key={branch.id} 
            className="p-6 rounded-2xl shadow-sm border-border/60 hover-elevate transition-all cursor-pointer"
            data-testid={`card-branch-${branch.id}`}
            onClick={() => setLocation(`/branches/${branch.id}`)}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-lg text-slate-800 mb-1">
                  {branch.name}
                </h3>
                {branch.location && (
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>{branch.location}</span>
                  </div>
                )}
              </div>
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </div>
            
            <div className="mt-4 pt-4 border-t border-dashed flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>اضغط للدخول</span>
              </div>
              <Badge variant="outline" className="text-xs">
                #{branch.id}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
    </AdminGate>
  );
}
