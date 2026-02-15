import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertRobotProfileSchema, insertRunSchema, insertJournalEntrySchema } from "@shared/schema";
import { registerChatRoutes } from "./replit_integrations/chat/routes";
import { executeRunOnDevbox } from "./runloop";
import { getCalendarEvents } from "./google-calendar";
import { getEmailSignals } from "./google-mail";

function generateInstructionPack(robotName: string, mode: string, safety: string, command: string, context: string | null, urgency: number) {
  const safetyChecks = [
    "Check for obstacles in path",
    "Verify no people in immediate danger zone",
    "Confirm environment is safe to proceed",
  ];
  if (safety === "conservative") {
    safetyChecks.push("Request user confirmation before each major step");
    safetyChecks.push("Double-check all measurements and distances");
  }
  if (urgency > 70) {
    safetyChecks.push("Prioritize speed while maintaining minimum safety standards");
  }

  const baseSteps = [
    { title: "Initialize and assess environment", details: "Scan surroundings, identify obstacles, map the area", checkpoints: ["Environment scanned", "Map generated"] },
    { title: "Plan optimal route", details: `Calculate the best path to accomplish: ${command}`, checkpoints: ["Route calculated", "Alternatives identified"] },
    { title: "Execute primary task", details: `Carry out the main objective: ${command}`, checkpoints: ["Task in progress", "Monitoring for issues"] },
    { title: "Verify completion", details: "Confirm task was completed successfully and safely", checkpoints: ["Task verified", "Area secured"] },
  ];

  if (context) {
    baseSteps.splice(1, 0, {
      title: "Apply constraints",
      details: `Consider additional context: ${context}`,
      checkpoints: ["Constraints reviewed", "Adjustments made"],
    });
  }

  return {
    goal: `${robotName} will ${command.toLowerCase().startsWith("i") ? "" : ""}${command}`,
    assumptions: [
      `${robotName} has sufficient battery for the task`,
      "Environment is as described",
      `Operating in ${mode} mode with ${safety} safety level`,
    ],
    steps: baseSteps,
    constraints: context ? [context] : ["Standard operating constraints apply"],
    safety_checks: safetyChecks,
    success_criteria: [
      "Task completed without incidents",
      "No safety violations detected",
      "Environment left in acceptable state",
    ],
  };
}

function generateRunSummary(robotName: string, command: string, runNotes: string) {
  return {
    run_summary: `${robotName} executed the task: "${command}". The run was completed with standard performance metrics. Overall execution followed the planned instruction pack with minor adaptations to real-world conditions.`,
    what_went_well: [
      "Navigation was smooth and efficient",
      "Safety protocols were followed correctly",
      "Task was completed within expected timeframe",
    ],
    issues: [
      "Minor hesitation at transition points",
      "Sensor recalibration needed during mid-run",
    ],
    risk_flags: urgencyRiskFlags(command),
    next_run_suggestions: [
      "Pre-map transition areas for smoother navigation",
      "Calibrate sensors before starting the run",
      "Consider adding waypoints for complex routes",
    ],
  };
}

function urgencyRiskFlags(command: string): string[] {
  const flags: string[] = [];
  const lower = command.toLowerCase();
  if (lower.includes("deliver") || lower.includes("carry")) {
    flags.push("Object handling safety");
  }
  if (lower.includes("people") || lower.includes("person") || lower.includes("human")) {
    flags.push("Human proximity awareness");
  }
  if (lower.includes("outside") || lower.includes("outdoor")) {
    flags.push("Weather conditions");
  }
  if (flags.length === 0) {
    flags.push("Standard operational risk");
  }
  return flags;
}

function generateImprovedPlan(feedback: string, rating: string) {
  const changes: string[] = [];
  if (rating === "needs_improvement") {
    changes.push("Adjust timing parameters for smoother execution");
    changes.push("Add additional checkpoint verification steps");
  } else if (rating === "not_acceptable") {
    changes.push("Complete re-evaluation of approach needed");
    changes.push("Add extra safety checks at every step");
    changes.push("Reduce speed and increase caution levels");
  } else {
    changes.push("Minor optimizations for efficiency");
  }

  if (feedback) {
    changes.push(`Incorporate user feedback: "${feedback}"`);
  }

  return {
    updated_plan_notes: `Based on ${rating === "worked" ? "positive" : rating === "needs_improvement" ? "constructive" : "critical"} feedback, the plan has been updated to improve future runs.`,
    recommended_changes: changes,
    next_instruction_pack_delta: [
      "Updated environmental awareness parameters",
      "Refined decision-making thresholds",
      ...(feedback ? [`Added learned preference: ${feedback}`] : []),
    ],
  };
}

function getFallbackCalendarData() {
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  return {
    events: [
      { id: "cal_001", title: "Standup Meeting", start: `${today}T09:30:00`, end: `${today}T10:00:00`, type: "work", stress_level: "low" },
      { id: "cal_002", title: "Product Strategy Review", start: `${today}T10:30:00`, end: `${today}T11:30:00`, type: "work", stress_level: "high" },
      { id: "cal_003", title: "Lunch Block", start: `${today}T12:30:00`, end: `${today}T13:30:00`, type: "personal", stress_level: "none" },
      { id: "cal_004", title: "Investor Sync", start: `${today}T14:00:00`, end: `${today}T15:00:00`, type: "work", stress_level: "high" },
      { id: "cal_005", title: "Deep Work Block", start: `${today}T15:30:00`, end: `${today}T17:30:00`, type: "focus", stress_level: "medium" },
      { id: "cal_006", title: "Gym", start: `${today}T18:00:00`, end: `${today}T18:45:00`, type: "health", stress_level: "positive" },
      { id: "cal_007", title: "Free Evening Window", start: `${today}T19:00:00`, end: `${today}T22:00:00`, type: "free", stress_level: "none" },
      { id: "cal_008", title: "Morning Planning", start: `${tomorrow}T08:30:00`, end: `${tomorrow}T09:00:00`, type: "work", stress_level: "low" },
      { id: "cal_009", title: "Design Review", start: `${tomorrow}T11:00:00`, end: `${tomorrow}T12:00:00`, type: "work", stress_level: "medium" },
      { id: "cal_010", title: "Friends Dinner", start: `${tomorrow}T19:30:00`, end: `${tomorrow}T21:30:00`, type: "social", stress_level: "positive" },
    ],
    freeWindows: [
      { start: `${today}T07:00:00`, end: `${today}T09:30:00`, duration: "2h 30m" },
      { start: `${today}T10:00:00`, end: `${today}T10:30:00`, duration: "30m" },
      { start: `${today}T11:30:00`, end: `${today}T12:30:00`, duration: "1h" },
      { start: `${today}T13:30:00`, end: `${today}T14:00:00`, duration: "30m" },
      { start: `${today}T19:00:00`, end: `${today}T22:00:00`, duration: "3h" },
    ],
    source: "fallback",
  };
}

function getFallbackEmailSignals() {
  return [
    { id: "mail_001", from: "OpenTable", subject: "Dinner Reservation Confirmation", date: new Date().toISOString(), snippet: "Your reservation for tonight at 7:30 PM is confirmed.", type: "reservation", confidence: 0.92, actionable: true },
    { id: "mail_002", from: "Team Lead", subject: "Deck needed before Monday", date: new Date().toISOString(), snippet: "Please finalize the presentation deck before end of day Monday.", type: "urgent", confidence: 0.88, actionable: true },
    { id: "mail_003", from: "Amazon", subject: "Package arriving today", date: new Date().toISOString(), snippet: "Your package is out for delivery and will arrive by 5 PM.", type: "delivery", confidence: 0.95, actionable: true },
    { id: "mail_004", from: "Local Deals", subject: "Valentine Offers Nearby", date: new Date().toISOString(), snippet: "Check out Valentine's Day specials near you.", type: "newsletter", confidence: 0.65, actionable: false },
    { id: "mail_005", from: "Google Flights", subject: "Flight Price Drop Alert", date: new Date().toISOString(), snippet: "Prices dropped for your saved flight to NYC.", type: "general", confidence: 0.60, actionable: false },
    { id: "mail_006", from: "Substack", subject: "Weekly AI Newsletter", date: new Date().toISOString(), snippet: "This week in AI: latest breakthroughs and industry news.", type: "newsletter", confidence: 0.99, actionable: false },
    { id: "mail_007", from: "Chase Bank", subject: "Credit Card Statement Ready", date: new Date().toISOString(), snippet: "Your February statement is ready to view.", type: "general", confidence: 0.98, actionable: true },
    { id: "mail_008", from: "Google Calendar", subject: "Added: Demo Rehearsal", date: new Date().toISOString(), snippet: "You've been invited to Demo Rehearsal on Feb 16.", type: "event_invite", confidence: 0.90, actionable: true },
    { id: "mail_009", from: "Wellness App", subject: "Don't forget hydration", date: new Date().toISOString(), snippet: "Stay hydrated! You're behind on your daily water goal.", type: "general", confidence: 0.75, actionable: false },
    { id: "mail_010", from: "DevOps Bot", subject: "Runloop execution logs attached", date: new Date().toISOString(), snippet: "Execution logs for run #47 are attached.", type: "general", confidence: 0.80, actionable: false },
  ];
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/robot/create", async (req, res) => {
    try {
      const parsed = insertRobotProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid robot data", errors: parsed.error.errors });
      }
      const robot = await storage.createRobot(parsed.data);
      res.json(robot);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/robots", async (req, res) => {
    try {
      const robots = await storage.getAllRobots();
      res.json(robots);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/robots/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteRobot(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Robot not found" });
      res.json({ message: "Robot deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/robots/:id", async (req, res) => {
    try {
      const robot = await storage.getRobot(req.params.id);
      if (!robot) return res.status(404).json({ message: "Robot not found" });
      res.json(robot);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/run/create", async (req, res) => {
    try {
      const parsed = insertRunSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid run data", errors: parsed.error.errors });
      }

      const robot = await storage.getRobot(parsed.data.robotId);
      if (!robot) return res.status(404).json({ message: "Robot not found" });

      const instructionPack = generateInstructionPack(
        robot.name,
        robot.mode,
        robot.safetyLevel,
        parsed.data.command,
        parsed.data.context || null,
        parsed.data.urgency || 50,
      );

      const run = await storage.createRun({
        ...parsed.data,
        videoUrl: null,
        userRating: null,
        userFeedback: null,
      });

      const updated = await storage.updateRun(run.id, {
        instructionPack,
        status: "processing",
      });

      res.json(updated);

      executeRunOnDevbox(instructionPack, robot.name, robot.mode, robot.safetyLevel)
        .then(async (result) => {
          const aiSummary = generateRunSummary(robot.name, parsed.data.command, "");
          aiSummary.run_summary = `${robot.name} executed "${parsed.data.command}" on Runloop devbox ${result.devboxId}. ${result.steps.filter(s => s.success).length}/${result.steps.length} steps completed successfully in ${(result.totalDuration / 1000).toFixed(1)}s.`;
          aiSummary.what_went_well = result.steps.filter(s => s.success).map(s => s.stepTitle);
          aiSummary.issues = result.steps.filter(s => !s.success).map(s => `${s.stepTitle}: ${s.stderr || "Failed"}`);

          await storage.updateRun(run.id, {
            status: result.status === "success" ? "complete" : "failed",
            devboxId: result.devboxId || null,
            runloopOutput: result,
            aiSummary,
          });
          console.log(`[runloop] Run ${run.id} completed with status: ${result.status}`);
        })
        .catch(async (error) => {
          console.error(`[runloop] Run ${run.id} failed:`, error.message);
          await storage.updateRun(run.id, {
            status: "failed",
            runloopOutput: { error: error.message, steps: [], totalDuration: 0, devboxId: "", devboxStatus: "error", status: "failure" },
          });
        });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/runs", async (req, res) => {
    try {
      const allRuns = await storage.getAllRuns();
      res.json(allRuns);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/runs/:robotId", async (req, res) => {
    try {
      const runs = await storage.getRunsByRobot(req.params.robotId);
      res.json(runs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/run/:id", async (req, res) => {
    try {
      const run = await storage.getRun(req.params.id);
      if (!run) return res.status(404).json({ message: "Run not found" });
      res.json(run);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/run/:id/complete", async (req, res) => {
    try {
      const run = await storage.getRun(req.params.id);
      if (!run) return res.status(404).json({ message: "Run not found" });

      const robot = await storage.getRobot(run.robotId);
      const robotName = robot?.name || "Robot";

      const aiSummary = generateRunSummary(
        robotName,
        run.command,
        req.body.runNotes || "",
      );

      const updated = await storage.updateRun(run.id, {
        status: "complete",
        videoUrl: req.body.videoUrl || null,
        aiSummary,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/run/:id/feedback", async (req, res) => {
    try {
      const run = await storage.getRun(req.params.id);
      if (!run) return res.status(404).json({ message: "Run not found" });

      const { rating, feedback } = req.body;
      if (!rating) return res.status(400).json({ message: "Rating is required" });

      const improvedPlan = generateImprovedPlan(feedback || "", rating);

      const updated = await storage.updateRun(run.id, {
        userRating: rating,
        userFeedback: feedback || null,
        improvedPlan,
      });

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/robots/:id", async (req, res) => {
    try {
      const updated = await storage.updateRobot(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Robot not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/journal", async (req, res) => {
    try {
      const robotId = req.query.robotId as string | undefined;
      const entries = await storage.getJournalEntries(robotId);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/journal/:id", async (req, res) => {
    try {
      const entry = await storage.getJournalEntry(req.params.id);
      if (!entry) return res.status(404).json({ message: "Entry not found" });
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/journal", async (req, res) => {
    try {
      const parsed = insertJournalEntrySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid journal data", errors: parsed.error.errors });
      }
      const entry = await storage.createJournalEntry(parsed.data);
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/integrations/status", async (req, res) => {
    try {
      const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
      const xReplitToken = process.env.REPL_IDENTITY
        ? 'repl ' + process.env.REPL_IDENTITY
        : process.env.WEB_REPL_RENEWAL
        ? 'depl ' + process.env.WEB_REPL_RENEWAL
        : null;

      if (!hostname || !xReplitToken) {
        return res.json({ calendar: false, gmail: false });
      }

      const headers = { 'Accept': 'application/json', 'X_REPLIT_TOKEN': xReplitToken };

      const [calRes, gmailRes] = await Promise.allSettled([
        fetch(`https://${hostname}/api/v2/connection?include_secrets=false&connector_names=google-calendar`, { headers }).then(r => r.json()),
        fetch(`https://${hostname}/api/v2/connection?include_secrets=false&connector_names=google-mail`, { headers }).then(r => r.json()),
      ]);

      const calConnected = calRes.status === 'fulfilled' && calRes.value?.items?.[0]?.settings?.access_token;
      const gmailConnected = gmailRes.status === 'fulfilled' && gmailRes.value?.items?.[0]?.settings?.access_token;

      res.json({
        calendar: !!calConnected,
        gmail: !!gmailConnected,
      });
    } catch (error: any) {
      console.error("[integrations] Error checking status:", error.message);
      res.json({ calendar: false, gmail: false });
    }
  });

  app.get("/api/calendar/events", async (req, res) => {
    try {
      const timeMin = req.query.timeMin as string | undefined;
      const timeMax = req.query.timeMax as string | undefined;
      const data = await getCalendarEvents(timeMin, timeMax);
      res.json(data);
    } catch (error: any) {
      console.error("[calendar] Live API failed, using fallback data:", error.message);
      res.json(getFallbackCalendarData());
    }
  });

  app.get("/api/email/signals", async (req, res) => {
    try {
      const maxResults = parseInt(req.query.maxResults as string) || 15;
      const signals = await getEmailSignals(maxResults);
      res.json(signals);
    } catch (error: any) {
      console.error("[gmail] Live API failed, using fallback data:", error.message);
      res.json(getFallbackEmailSignals());
    }
  });

  registerChatRoutes(app);

  return httpServer;
}
