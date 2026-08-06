import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Banknote, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface BranchRow {
  id: number;
  name: string;
  today: number;
}

interface LiveRevenue {
  date: string;
  asOf: string;
  branches: BranchRow[];
  total: number;
}

/**
 * The owner's live takings board — today's cash, per centre, as it arrives.
 *
 * Counts ONLY `payments`: money a patient actually handed over. Not costs, not
 * invoices raised, not what is owed. The day is bounded exactly as the daily
 * report bounds it (Baghdad midnight), so the two screens can never disagree.
 *
 * Admin only — the server refuses anyone else, this merely keeps it off screen.
 */
function useCountUp(target: number, duration = 600) {
  const [shown, setShown] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number>();

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    const startedAt = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      // Ease-out: the number sprints then settles, so a jump reads as an event.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (target - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target, duration]);

  return shown;
}

function Amount({ value, className }: { value: number; className?: string }) {
  const shown = useCountUp(value);
  return <span className={className}>{shown.toLocaleString("en-US")}</span>;
}

export function LiveRevenueBoard() {
  // Three seconds: fast enough that a payment lands while the patient is still
  // at the desk, cheap enough that it is one grouped SUM per tick.
  const { data, isError } = useQuery<LiveRevenue>({
    queryKey: ["/api/dashboard/live-revenue"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/live-revenue", { credentials: "include" });
      if (!res.ok) throw new Error("forbidden");
      return res.json();
    },
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
    staleTime: 0,
    retry: false,
  });

  if (isError || !data) return null;

  return (
    <div className="space-y-3" data-testid="live-revenue-board">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <Radio className="w-5 h-5 text-emerald-600" />
          الوارد المباشر اليوم
        </h3>
        <span className="text-xs text-muted-foreground">
          المبالغ المستلمة فعلياً — تتحدّث لحظياً
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {data.branches.map((b) => (
          <Card
            key={b.id}
            className="p-4 rounded-2xl border-border/60 shadow-sm bg-white"
            data-testid={`live-revenue-branch-${b.id}`}
          >
            <p className="text-sm text-muted-foreground mb-1 truncate" title={b.name}>{b.name}</p>
            <p className="text-2xl font-bold text-slate-800 tabular-nums">
              <Amount value={b.today} />
              <span className="text-sm font-normal text-muted-foreground mr-1">د.ع</span>
            </p>
          </Card>
        ))}
      </div>

      {/* The fifth counter: the sum of the cards above, added on the client from
          those very numbers so it can never contradict them. */}
      <Card
        className="p-5 rounded-2xl border-emerald-200 bg-gradient-to-l from-emerald-50 to-teal-50 shadow-sm"
        data-testid="live-revenue-total"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-sm text-emerald-900/70">مجموع كل الفروع اليوم</p>
              <p className="text-xs text-emerald-900/50">{data.date}</p>
            </div>
          </div>
          <p className="text-3xl md:text-4xl font-extrabold text-emerald-800 tabular-nums">
            <Amount value={data.total} />
            <span className="text-base font-normal mr-1">د.ع</span>
          </p>
        </div>
      </Card>
    </div>
  );
}
