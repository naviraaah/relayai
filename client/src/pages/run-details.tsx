import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Run, RobotProfile } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Lightbulb,
  ThumbsUp, AlertCircle, X, Play, Clock, Activity,
  ChevronDown, ChevronUp, Send, Zap, Terminal, Server, Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { RobotAvatar } from "@/components/robot-avatar";

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

export default function RunDetails() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;

  const [showInstructions, setShowInstructions] = useState(false);
  const [showRunloopDetails, setShowRunloopDetails] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState<string | null>(null);

  const { data: run, isLoading: runLoading } = useQuery<Run>({
    queryKey: ["/api/run", runId],
    refetchInterval: (query) => {
      const data = query.state.data as Run | undefined;
      if (data?.status === "processing" || data?.status === "queued") return 3000;
      return false;
    },
  });

  const { data: robot } = useQuery<RobotProfile>({
    queryKey: ["/api/robots", run?.robotId],
    enabled: !!run?.robotId,
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/run/${runId}/complete`, {
        videoUrl: "",
        runNotes: `Command: ${run?.command}. The robot executed the task.`,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/run", runId] });
      if (run?.robotId) {
        queryClient.invalidateQueries({ queryKey: ["/api/runs", run.robotId] });
      }
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/run/${runId}/feedback`, {
        rating: rating!,
        feedback,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/run", runId] });
      setFeedback("");
      setRating(null);
    },
  });

  if (runLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-12 w-full rounded-md" />
          <Skeleton className="h-48 w-full rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-heading text-2xl mb-2">Run not found</h2>
          <Link href="/"><Button className="btn-gradient" data-testid="button-go-home">Go Home</Button></Link>
        </div>
      </div>
    );
  }

  const instructionPack = run.instructionPack as any;
  const aiSummary = run.aiSummary as any;
  const improvedPlan = run.improvedPlan as any;
  const runloopOutput = run.runloopOutput as any;

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href={robot ? `/console/${robot.id}` : "/"}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          {robot && (
            <RobotAvatar color={robot.avatarColor} size="sm" name={robot.name} />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-lg font-bold" data-testid="text-run-title">Run Details</h1>
          </div>
          <StatusBadge status={run.status} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="p-5 rounded-md glass-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Command</h3>
            <p className="text-foreground" data-testid="text-run-command">{run.command}</p>
            {run.context && (
              <>
                <h3 className="text-sm font-medium text-muted-foreground mb-1 mt-3">Context</h3>
                <p className="text-sm text-foreground">{run.context}</p>
              </>
            )}
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
              <span>Urgency: {run.urgency}/100</span>
              <span>{run.createdAt ? new Date(run.createdAt).toLocaleString() : ""}</span>
            </div>
          </div>

          {instructionPack && (
            <div className="p-5 rounded-md glass-card">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full flex items-center justify-between"
                data-testid="button-toggle-instructions"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, hsl(270 50% 65% / 0.2), hsl(300 40% 70% / 0.2))" }}>
                    <Lightbulb className="w-3 h-3 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold">AI Instruction Pack</h3>
                </div>
                {showInstructions ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {showInstructions && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 space-y-3"
                >
                  {instructionPack.goal && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Goal</span>
                      <p className="text-sm mt-1">{instructionPack.goal}</p>
                    </div>
                  )}
                  {instructionPack.steps && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Steps</span>
                      <div className="mt-2 space-y-2">
                        {instructionPack.steps.map((step: any, i: number) => (
                          <div key={i} className="flex gap-3 items-start">
                            <div className="w-6 h-6 rounded-full text-xs flex items-center justify-center shrink-0 mt-0.5 font-semibold text-white"
                              style={{ background: `linear-gradient(135deg, ${robot?.avatarColor || "hsl(270 50% 65%)"}, hsl(270 50% 55%))` }}>
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{step.title}</p>
                              <p className="text-xs text-muted-foreground">{step.details}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {instructionPack.safety_checks && instructionPack.safety_checks.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Safety Checks</span>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {instructionPack.safety_checks.map((check: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{check}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {run.status === "processing" && (
            <div className="p-5 rounded-md glass-card" data-testid="card-processing">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <div>
                  <h3 className="font-heading font-semibold">Executing on Runloop</h3>
                  <p className="text-sm text-muted-foreground">
                    A devbox is running your instruction pack. This may take a moment...
                  </p>
                </div>
              </div>
            </div>
          )}

          {runloopOutput && (runloopOutput.error || (runloopOutput.steps && runloopOutput.steps.length > 0)) && (
            <div className="p-5 rounded-md glass-card" data-testid="card-runloop-output">
              <button
                onClick={() => setShowRunloopDetails(!showRunloopDetails)}
                className="w-full flex items-center justify-between"
                data-testid="button-toggle-runloop"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
                    <Terminal className="w-3 h-3 text-blue-500" />
                  </div>
                  <h3 className="font-heading font-semibold">Runloop Execution</h3>
                  {runloopOutput.steps && runloopOutput.steps.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {runloopOutput.steps.filter((s: any) => s.success).length}/{runloopOutput.steps.length} passed
                    </Badge>
                  )}
                </div>
                {showRunloopDetails ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                {runloopOutput.devboxId && (
                  <span className="flex items-center gap-1">
                    <Server className="w-3 h-3" />
                    Devbox: {runloopOutput.devboxId.slice(0, 12)}...
                  </span>
                )}
                {runloopOutput.totalDuration && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {(runloopOutput.totalDuration / 1000).toFixed(1)}s
                  </span>
                )}
                <Badge
                  variant={runloopOutput.status === "success" ? "secondary" : "destructive"}
                  className="text-xs"
                >
                  {runloopOutput.status}
                </Badge>
              </div>

              {showRunloopDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 space-y-3"
                >
                  {runloopOutput.error && (
                    <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/20" data-testid="runloop-error">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="text-sm font-medium">Execution Error</span>
                      </div>
                      <pre className="mt-1 text-xs text-red-600 dark:text-red-400 p-2 rounded whitespace-pre-wrap">
                        {runloopOutput.error}
                      </pre>
                    </div>
                  )}
                  {runloopOutput.steps && runloopOutput.steps.map((step: any, i: number) => (
                    <div
                      key={i}
                      className={`p-3 rounded-md ${step.success ? "glass-subtle" : "bg-red-50 dark:bg-red-950/20"}`}
                      data-testid={`runloop-step-${i}`}
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {step.success ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <span className="text-sm font-medium">{step.stepTitle}</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          exit: {step.exitCode}
                        </Badge>
                      </div>
                      {step.stdout && (
                        <pre className="mt-2 text-xs bg-black/5 dark:bg-white/5 p-2 rounded overflow-x-auto whitespace-pre-wrap" data-testid={`runloop-stdout-${i}`}>
                          {step.stdout}
                        </pre>
                      )}
                      {step.stderr && (
                        <pre className="mt-1 text-xs text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-950/20 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                          {step.stderr}
                        </pre>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          )}

          {run.status === "queued" && (
            <div className="p-5 rounded-md glass-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(270 50% 65% / 0.2), hsl(300 40% 70% / 0.2))" }}>
                  <Play className="w-3 h-3 text-primary" />
                </div>
                <h3 className="font-heading font-semibold">Simulate Run</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Mark this run as complete to generate an AI summary and review.
              </p>
              <Button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="gap-2"
                data-testid="button-simulate-run"
                style={{
                  background: `linear-gradient(135deg, ${robot?.avatarColor || "hsl(270 50% 65%)"}, hsl(270 50% 55%))`,
                  border: `1px solid ${robot?.avatarColor || "hsl(270 50% 65%)"}`,
                }}
              >
                <Zap className="w-4 h-4" />
                {completeMutation.isPending ? "Processing..." : "Complete Run"}
              </Button>
            </div>
          )}

          {aiSummary && (
            <div className="p-5 rounded-md glass-card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                </div>
                <h3 className="font-heading font-semibold">AI Run Summary</h3>
              </div>
              <div className="space-y-4">
                {aiSummary.run_summary && (
                  <p className="text-sm">{aiSummary.run_summary}</p>
                )}
                {aiSummary.what_went_well && aiSummary.what_went_well.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">What Went Well</span>
                    <ul className="mt-1 space-y-1">
                      {aiSummary.what_went_well.map((item: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <ThumbsUp className="w-3 h-3 text-green-500 mt-1 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiSummary.issues && aiSummary.issues.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400 uppercase tracking-wide">Issues</span>
                    <ul className="mt-1 space-y-1">
                      {aiSummary.issues.map((item: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <AlertCircle className="w-3 h-3 text-yellow-500 mt-1 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiSummary.risk_flags && aiSummary.risk_flags.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">Risk Flags</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {aiSummary.risk_flags.map((flag: string, i: number) => (
                        <Badge key={i} variant="destructive" className="text-xs">{flag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {aiSummary.next_run_suggestions && aiSummary.next_run_suggestions.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-primary uppercase tracking-wide">Suggestions for Next Run</span>
                    <ul className="mt-1 space-y-1">
                      {aiSummary.next_run_suggestions.map((item: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <Lightbulb className="w-3 h-3 text-primary mt-1 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {run.status === "complete" && !run.userRating && (
            <div className="p-5 rounded-md glass-card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(270 50% 65% / 0.2), hsl(300 40% 70% / 0.2))" }}>
                  <Send className="w-3 h-3 text-primary" />
                </div>
                <h3 className="font-heading font-semibold">Teach the Robot</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Rate this run and share feedback to help improve future performance.
              </p>
              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { value: "worked", label: "Worked", icon: ThumbsUp, color: "text-green-500", bg: "rgba(34,197,94,0.08)" },
                  { value: "needs_improvement", label: "Needs Work", icon: AlertCircle, color: "text-yellow-500", bg: "rgba(245,158,11,0.08)" },
                  { value: "not_acceptable", label: "Not OK", icon: X, color: "text-red-500", bg: "rgba(239,68,68,0.08)" },
                ].map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.value}
                      data-testid={`button-rating-${r.value}`}
                      onClick={() => setRating(r.value)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-md transition-all text-sm font-medium ${
                        rating === r.value
                          ? "glass-card ring-2 ring-primary/30"
                          : "glass-subtle"
                      } hover-elevate`}
                      style={{
                        background: rating === r.value ? r.bg : undefined,
                      }}
                    >
                      <Icon className={`w-4 h-4 ${r.color}`} />
                      {r.label}
                    </button>
                  );
                })}
              </div>
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">
                  Feedback
                  <span className="text-muted-foreground ml-1 font-normal">(optional)</span>
                </Label>
                <Textarea
                  data-testid="input-feedback"
                  placeholder="What should the robot do differently next time?"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="resize-none"
                />
              </div>
              <Button
                onClick={() => feedbackMutation.mutate()}
                disabled={!rating || feedbackMutation.isPending}
                className="gap-2"
                data-testid="button-submit-feedback"
                style={{
                  background: rating ? `linear-gradient(135deg, ${robot?.avatarColor || "hsl(270 50% 65%)"}, hsl(270 50% 55%))` : undefined,
                  border: rating ? `1px solid ${robot?.avatarColor || "hsl(270 50% 65%)"}` : undefined,
                }}
              >
                <Send className="w-4 h-4" />
                {feedbackMutation.isPending ? "Sending..." : "Submit Feedback"}
              </Button>
            </div>
          )}

          {run.userRating && (
            <div className="p-5 rounded-md glass-card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                </div>
                <h3 className="font-heading font-semibold">Feedback Submitted</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Rating: <Badge variant="secondary" className="ml-1">{run.userRating}</Badge>
              </p>
              {run.userFeedback && (
                <p className="text-sm mt-2 italic">"{run.userFeedback}"</p>
              )}
            </div>
          )}

          {improvedPlan && (
            <div className="p-5 rounded-md glass-card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(270 50% 65% / 0.2), hsl(300 40% 70% / 0.2))" }}>
                  <Lightbulb className="w-3 h-3 text-primary" />
                </div>
                <h3 className="font-heading font-semibold">Improved Plan</h3>
              </div>
              <div className="space-y-3">
                {improvedPlan.updated_plan_notes && (
                  <p className="text-sm">{improvedPlan.updated_plan_notes}</p>
                )}
                {improvedPlan.recommended_changes && improvedPlan.recommended_changes.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recommended Changes</span>
                    <ul className="mt-1 space-y-1">
                      {improvedPlan.recommended_changes.map((item: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <ChevronDown className="w-3 h-3 text-primary mt-1 shrink-0 rotate-[-90deg]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
