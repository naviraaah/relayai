import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { RobotProfile, Run } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, Clock, CheckCircle2, AlertTriangle,
  ChevronRight, Filter
} from "lucide-react";
import { motion } from "framer-motion";
import { RobotAvatar } from "@/components/robot-avatar";

type FilterType = "all" | "queued" | "processing" | "complete" | "failed";

const filters: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "queued", label: "Queued" },
  { value: "processing", label: "In Progress" },
  { value: "complete", label: "Completed" },
  { value: "failed", label: "Failed" },
];

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: typeof Clock }> = {
    queued: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Clock },
    processing: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Activity },
    complete: { color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
    failed: { color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: AlertTriangle },
  };
  const c = config[status] || config.queued;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.color}`}>
      <Icon className="w-3 h-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function RunsFeed() {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const { data: allRuns, isLoading: runsLoading } = useQuery<Run[]>({
    queryKey: ["/api/runs"],
  });

  const { data: robots } = useQuery<RobotProfile[]>({
    queryKey: ["/api/robots"],
  });

  const robotMap = new Map<string, RobotProfile>();
  robots?.forEach(r => robotMap.set(r.id, r));

  const filteredRuns = (allRuns || []).filter(
    r => activeFilter === "all" || r.status === activeFilter
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="font-heading text-2xl font-bold" data-testid="text-runs-title">All Runs</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {allRuns ? `${allRuns.length} total runs across all robots` : "Loading..."}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-muted-foreground mr-1" />
          </div>
        </div>

        <div className="flex gap-1 mb-6 p-1 rounded-md glass-subtle overflow-x-auto" data-testid="filter-bar">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeFilter === f.value
                  ? "glass-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
              data-testid={`filter-${f.value}`}
            >
              {f.label}
              {f.value !== "all" && allRuns && (
                <span className="ml-1.5 text-xs opacity-60">
                  {allRuns.filter(r => r.status === f.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {runsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))}
        </div>
      ) : filteredRuns.length > 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          {filteredRuns.map((run, i) => {
            const robot = robotMap.get(run.robotId);
            const summary = run.aiSummary as any;
            const riskFlags = summary?.risk_flags || [];
            const hasIssues = riskFlags.some((f: string) => f !== "Standard operational risk");

            return (
              <motion.div
                key={run.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link href={`/run/${run.id}`}>
                  <div
                    className="p-4 rounded-md glass-card hover-elevate cursor-pointer"
                    data-testid={`card-run-${run.id}`}
                  >
                    <div className="flex items-start gap-3">
                      {robot && (
                        <RobotAvatar color={robot.avatarColor} size="sm" name={robot.name} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <StatusBadge status={run.status} />
                          {robot && (
                            <Badge variant="outline" className="text-xs">{robot.name}</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {run.createdAt ? new Date(run.createdAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <p className="text-sm font-medium" data-testid={`text-run-command-${run.id}`}>
                          {run.command}
                        </p>
                        {summary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {summary.run_summary}
                          </p>
                        )}
                        {hasIssues && (
                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            {riskFlags.filter((f: string) => f !== "Standard operational risk").map((flag: string, fi: number) => (
                              <Badge key={fi} variant="secondary" className="text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                {flag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {run.userRating && (
                          <div className="mt-2">
                            <Badge variant={run.userRating === "worked" ? "secondary" : "destructive"} className="text-xs">
                              {run.userRating === "worked" ? "Worked" : run.userRating === "needs_improvement" ? "Needs improvement" : "Not acceptable"}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <div className="p-12 text-center rounded-md glass-card">
          <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">
            {activeFilter === "all" ? "No runs yet" : `No ${activeFilter} runs`}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {activeFilter === "all"
              ? "Send your first command from the Command Center"
              : "Try a different filter"}
          </p>
          {activeFilter === "all" && (
            <Link href="/command">
              <Button className="gap-2 btn-gradient" data-testid="button-go-to-command">
                Go to Command Center
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
