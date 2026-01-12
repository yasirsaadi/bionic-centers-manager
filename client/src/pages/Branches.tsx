import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Users, ArrowLeft } from "lucide-react";
import { AdminGate } from "@/components/AdminGate";
import type { Branch } from "@shared/schema";

export default function Branches() {
  const [, setLocation] = useLocation();
  const { data: branches, isLoading } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <AdminGate>
    <div className="space-y-6 page-transition py-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-slate-800">الفروع</h2>
          <p className="text-muted-foreground">فروع مركز بايونك في العراق</p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {branches?.length || 0} فروع
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
