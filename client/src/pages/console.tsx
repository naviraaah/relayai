import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RobotProfile, Run } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send, Activity, Clock, CheckCircle2, AlertTriangle,
  ChevronRight, Sparkles, ArrowLeft, Terminal, Cpu, Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
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

export default function Console() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const robotId = params.id;

  const { toast } = useToast();
  const [command, setCommand] = useState("");
  const [context, setContext] = useState("");
  const [urgency, setUrgency] = useState([50]);
  const [activeTab, setActiveTab] = useState<"command" | "runs">("command");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: robot, isLoading: robotLoading } = useQuery<RobotProfile>({
    queryKey: ["/api/robots", robotId],
  });

  const { data: runsData, isLoading: runsLoading } = useQuery<Run[]>({
    queryKey: ["/api/runs", robotId],
  });

  const createRun = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/run/create", {
        robotId,
        command,
        context: context || undefined,
        urgency: urgency[0],
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs", robotId] });
      setCommand("");
      setContext("");
      setUrgency([50]);
      setActiveTab("runs");
    },
  });

  const deleteRobot = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/robots/${robotId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/robots"] });
      toast({ title: "Robot deleted", description: `${robot?.name || "Robot"} has been removed.` });
      navigate("/");
    },
  });

  if (robotLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-20 w-full rounded-md" />
          <Skeleton className="h-64 w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (!robot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-heading text-2xl mb-2">Robot not found</h2>
          <Button onClick={() => navigate("/")} data-testid="button-go-home">Go Home</Button>
        </div>
      </div>
    );
  }

  const urgencyLabel = urgency[0] < 33 ? "Low" : urgency[0] < 66 ? "Medium" : "High";
  const urgencyColor = urgency[0] < 33 ? "text-green-500" : urgency[0] < 66 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <RobotAvatar color={robot.avatarColor} size="md" name={robot.name} />
          <div className="flex-1 min-w-0">
            <h1 className="font-heading text-xl font-bold truncate" data-testid="text-robot-name">
              {robot.name}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{robot.mode}</Badge>
              <Badge variant="outline" className="text-xs">{robot.safetyLevel}</Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteConfirm(true)}
            data-testid="button-delete-robot"
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4"
            >
              <div className="p-4 rounded-md glass-card" style={{ border: "1px solid hsl(0 72% 51% / 0.3)" }}>
                <p className="text-sm font-medium mb-1">Delete {robot.name}?</p>
                <p className="text-xs text-muted-foreground mb-3">
                  This will permanently remove this robot and all its run history. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => deleteRobot.mutate()}
                    disabled={deleteRobot.isPending}
                    data-testid="button-confirm-delete"
                  >
                    {deleteRobot.isPending ? "Deleting..." : "Yes, Delete"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    data-testid="button-cancel-delete"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-1 mb-6 p-1 rounded-md glass-subtle">
          <button
            data-testid="tab-command"
            onClick={() => setActiveTab("command")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === "command"
                ? "glass-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Terminal className="w-4 h-4" />
            Command Center
          </button>
          <button
            data-testid="tab-runs"
            onClick={() => setActiveTab("runs")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === "runs"
                ? "glass-card text-foreground shadow-sm"
                : "text-muted-foreground"
            }`}
          >
            <Activity className="w-4 h-4" />
            Runs
            {runsData && runsData.length > 0 && (
              <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                {runsData.length}
              </span>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "command" ? (
            <motion.div
              key="command"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="p-6 rounded-md glass-card">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${robot.avatarColor}33, hsl(270 50% 70% / 0.2))` }}>
                    <Cpu className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h2 className="font-heading text-lg font-semibold">Send a Command</h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <Label htmlFor="command" className="text-sm font-medium mb-2 block">
                      Task / Command
                    </Label>
                    <Textarea
                      id="command"
                      data-testid="input-command"
                      placeholder={`Tell ${robot.name} what to do... e.g. "Navigate to the hallway and deliver an object safely"`}
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      className="min-h-[100px] text-base resize-none"
                    />
                  </div>

                  <div>
                    <Label htmlFor="context" className="text-sm font-medium mb-2 block">
                      Context / Constraints
                      <span className="text-muted-foreground ml-1 font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      id="context"
                      data-testid="input-context"
                      placeholder="Environment details, things to avoid, special instructions..."
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      className="min-h-[70px] resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium">Urgency</Label>
                      <span className={`text-sm font-semibold ${urgencyColor}`}>{urgencyLabel}</span>
                    </div>
                    <Slider
                      data-testid="slider-urgency"
                      value={urgency}
                      onValueChange={setUrgency}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Low</span>
                      <span>High</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => createRun.mutate()}
                    disabled={!command.trim() || createRun.isPending}
                    className="w-full gap-2"
                    data-testid="button-send-command"
                    style={{
                      background: command.trim() ? `linear-gradient(135deg, ${robot.avatarColor}, hsl(270 50% 55%))` : undefined,
                      border: command.trim() ? `1px solid ${robot.avatarColor}` : undefined,
                    }}
                  >
                    <Send className="w-4 h-4" />
                    {createRun.isPending ? "Sending..." : "Send to Robot"}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="runs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {runsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-md" />
                ))
              ) : runsData && runsData.length > 0 ? (
                runsData.map((run) => (
                  <Link key={run.id} href={`/run/${run.id}`}>
                    <div
                      className="p-4 rounded-md glass-card hover-elevate cursor-pointer transition-all"
                      data-testid={`card-run-${run.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <StatusBadge status={run.status} />
                            <span className="text-xs text-muted-foreground">
                              {run.createdAt
                                ? new Date(run.createdAt).toLocaleDateString()
                                : ""}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground truncate" data-testid={`text-run-command-${run.id}`}>
                            {run.command}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-8 text-center rounded-md glass-card">
                  <div className="mx-auto mb-4 w-fit">
                    <RobotAvatar color={robot.avatarColor} size="lg" name={robot.name} />
                  </div>
                  <h3 className="font-heading text-lg font-semibold mb-1">No runs yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Send your first command to {robot.name}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("command")}
                    data-testid="button-first-command"
                  >
                    Send a Command
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
