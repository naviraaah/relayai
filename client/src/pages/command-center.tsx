import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RobotProfile } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Send, Cpu, Bot
} from "lucide-react";
import { motion } from "framer-motion";
import { RobotAvatar } from "@/components/robot-avatar";
import { useToast } from "@/hooks/use-toast";

export default function CommandCenter() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [command, setCommand] = useState("");
  const [context, setContext] = useState("");
  const [urgency, setUrgency] = useState([50]);
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);

  const { data: robots, isLoading: robotsLoading } = useQuery<RobotProfile[]>({
    queryKey: ["/api/robots"],
  });

  const activeRobot = selectedRobotId
    ? robots?.find(r => r.id === selectedRobotId)
    : robots?.[0];

  const createRun = useMutation({
    mutationFn: async () => {
      if (!activeRobot) return;
      const res = await apiRequest("POST", "/api/run/create", {
        robotId: activeRobot.id,
        command,
        context: context || undefined,
        urgency: urgency[0],
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/runs", activeRobot?.id] });
      toast({ title: "Task sent", description: `${activeRobot?.name} is on it.` });
      setCommand("");
      setContext("");
      setUrgency([50]);
      if (data?.id) navigate(`/run/${data.id}`);
    },
  });

  const urgencyLabel = urgency[0] < 33 ? "Low" : urgency[0] < 66 ? "Medium" : "High";
  const urgencyColor = urgency[0] < 33 ? "text-green-500" : urgency[0] < 66 ? "text-yellow-500" : "text-red-500";

  if (robotsLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-12 w-64 rounded-md" />
        <Skeleton className="h-64 w-full rounded-md" />
      </div>
    );
  }

  if (!robots || robots.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="p-12 text-center rounded-md glass-card">
          <Bot className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">No robots available</h3>
          <p className="text-sm text-muted-foreground mb-4">Create a robot first to start sending commands</p>
          <Link href="/onboarding">
            <Button className="btn-gradient" data-testid="button-create-robot">Create a Robot</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2" data-testid="text-command-title">
          <Cpu className="w-6 h-6 text-primary" />
          Command Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send tasks to your robot companions
        </p>
      </motion.div>

      {robots.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <Label className="text-sm font-medium mb-2 block">Choose Robot</Label>
          <div className="flex gap-2 flex-wrap">
            {robots.map((robot) => {
              const isSelected = activeRobot?.id === robot.id;
              return (
                <button
                  key={robot.id}
                  onClick={() => setSelectedRobotId(robot.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all ${
                    isSelected
                      ? "ring-2 ring-primary/40 glass-card"
                      : "glass-subtle hover-elevate"
                  }`}
                  data-testid={`button-select-robot-${robot.id}`}
                >
                  <RobotAvatar color={robot.avatarColor} size="sm" name={robot.name} />
                  <span className="text-sm font-medium">{robot.name}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="p-6 rounded-md glass-card">
          {activeRobot && (
            <div className="flex items-center gap-2 mb-5">
              <RobotAvatar color={activeRobot.avatarColor} size="sm" name={activeRobot.name} />
              <span className="text-sm font-medium">Sending to {activeRobot.name}</span>
              <Badge variant="outline" className="text-xs">{activeRobot.mode}</Badge>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <Label htmlFor="command" className="text-sm font-medium mb-2 block">
                Task / Command
              </Label>
              <Textarea
                id="command"
                data-testid="input-command"
                placeholder={`Tell ${activeRobot?.name || "your robot"} what to do...`}
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
              <div className="flex items-center justify-between mb-3 gap-2">
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
              disabled={!command.trim() || !activeRobot || createRun.isPending}
              className="w-full gap-2 btn-gradient"
              data-testid="button-send-command"
            >
              <Send className="w-4 h-4" />
              {createRun.isPending ? "Sending..." : "Send to Robot"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
