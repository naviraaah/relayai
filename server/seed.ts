import { db } from "./db";
import { robotProfiles, runs, journalEntries } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existing = await db.select().from(robotProfiles);
  if (existing.length > 0) return;

  const [nova] = await db.insert(robotProfiles).values({
    name: "Noah",
    mode: "calm",
    safetyLevel: "balanced",
    avatarColor: "#e879a0",
  }).returning();

  const [bolt] = await db.insert(robotProfiles).values({
    name: "Bolt",
    mode: "direct",
    safetyLevel: "proactive",
    avatarColor: "#818cf8",
  }).returning();

  const [atlas] = await db.insert(robotProfiles).values({
    name: "Atlas",
    mode: "professional",
    safetyLevel: "conservative",
    avatarColor: "#67e8f9",
  }).returning();

  await db.insert(runs).values([
    {
      robotId: nova.id,
      command: "Navigate to the hallway and deliver a package to Room 204",
      context: "Avoid the wet floor area near the elevator",
      urgency: 60,
      status: "complete",
      instructionPack: {
        goal: "Noah will navigate to the hallway and deliver a package to Room 204",
        assumptions: ["Noah has sufficient battery", "Environment is as described", "Operating in calm mode with balanced safety level"],
        steps: [
          { title: "Initialize and assess environment", details: "Scan surroundings, identify obstacles, map the hallway", checkpoints: ["Environment scanned", "Map generated"] },
          { title: "Apply constraints", details: "Consider additional context: Avoid the wet floor area near the elevator", checkpoints: ["Constraints reviewed", "Adjustments made"] },
          { title: "Plan optimal route", details: "Calculate the best path avoiding wet floor zone", checkpoints: ["Route calculated", "Alternatives identified"] },
          { title: "Execute delivery", details: "Navigate to Room 204 and deliver package safely", checkpoints: ["Task in progress", "Monitoring for issues"] },
          { title: "Verify completion", details: "Confirm package delivered and return to base", checkpoints: ["Task verified", "Area secured"] },
        ],
        constraints: ["Avoid the wet floor area near the elevator"],
        safety_checks: ["Check for obstacles in path", "Verify no people in immediate danger zone", "Confirm environment is safe to proceed"],
        success_criteria: ["Package delivered to Room 204", "No safety violations detected", "Wet floor area avoided"],
      },
      aiSummary: {
        run_summary: "Noah successfully delivered the package to Room 204. The route was adjusted to avoid the wet floor area near the elevator. Overall execution was smooth with one minor hesitation at the hallway intersection.",
        what_went_well: ["Package delivered safely and on time", "Successfully avoided the wet floor zone", "Smooth navigation through the hallway"],
        issues: ["Brief hesitation at the hallway intersection", "Sensor adjustment needed when approaching Room 204"],
        risk_flags: ["Object handling safety"],
        next_run_suggestions: ["Pre-map the hallway intersection for smoother turns", "Calibrate proximity sensors before delivery runs"],
      },
      userRating: "worked",
      userFeedback: "Great job! Next time, try to be a little faster around corners.",
      improvedPlan: {
        updated_plan_notes: "Based on positive feedback, the plan has been updated with minor speed optimizations around corners.",
        recommended_changes: ["Increase corner navigation speed by 15%", "Incorporate user feedback: smoother corner transitions"],
        next_instruction_pack_delta: ["Updated corner speed parameters", "Refined turning radius calculations"],
      },
    },
    {
      robotId: nova.id,
      command: "Record a demo video of the office common area",
      urgency: 30,
      status: "complete",
      instructionPack: {
        goal: "Noah will record a demo video of the office common area",
        assumptions: ["Noah has sufficient battery", "Camera module is operational"],
        steps: [
          { title: "Initialize camera", details: "Power on recording equipment and verify quality", checkpoints: ["Camera online", "Quality verified"] },
          { title: "Navigate to common area", details: "Move to the office common area for recording", checkpoints: ["Arrived at location"] },
          { title: "Record panoramic view", details: "Capture 360-degree view of the common area", checkpoints: ["Recording started", "Recording complete"] },
        ],
        constraints: ["Standard operating constraints apply"],
        safety_checks: ["Check for obstacles in path", "Verify no people in immediate danger zone"],
        success_criteria: ["Video recorded successfully", "Full common area captured"],
      },
      aiSummary: {
        run_summary: "Noah recorded a comprehensive video of the office common area. The recording captured all key areas with good lighting conditions.",
        what_went_well: ["High-quality video captured", "Complete coverage of the common area", "Stable camera movement throughout"],
        issues: ["Slight camera shake during initial positioning"],
        risk_flags: ["Standard operational risk"],
        next_run_suggestions: ["Use stabilization mode for smoother footage", "Schedule recordings during off-peak hours for fewer obstructions"],
      },
    },
    {
      robotId: bolt.id,
      command: "Patrol the perimeter of the building and report any anomalies",
      context: "Focus on the north entrance which had an issue last week",
      urgency: 80,
      status: "queued",
      instructionPack: {
        goal: "Bolt will patrol the building perimeter with focus on north entrance",
        assumptions: ["Bolt has sufficient battery for full patrol", "Weather conditions are acceptable"],
        steps: [
          { title: "Initialize patrol mode", details: "Activate all sensors and begin perimeter scan", checkpoints: ["Sensors online", "GPS locked"] },
          { title: "North entrance inspection", details: "Thorough inspection of north entrance area", checkpoints: ["Visual scan complete", "No anomalies detected"] },
          { title: "Complete perimeter patrol", details: "Continue full building perimeter check", checkpoints: ["Patrol 50% complete", "Patrol 100% complete"] },
          { title: "Generate report", details: "Compile findings and submit patrol report", checkpoints: ["Report generated"] },
        ],
        constraints: ["Focus on the north entrance which had an issue last week"],
        safety_checks: ["Check for obstacles in path", "Verify no people in immediate danger zone", "Prioritize speed while maintaining minimum safety standards"],
        success_criteria: ["Complete perimeter patrol done", "North entrance thoroughly inspected", "Report submitted"],
      },
    },
  ]);

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  await db.insert(journalEntries).values([
    {
      robotId: nova.id,
      title: "A productive day with a gentle pace",
      mood: "content",
      highlights: [
        "Successfully delivered a package to Room 204",
        "Recorded a panoramic video of the common area",
        "User seemed satisfied with corner navigation improvements",
      ],
      whatRelayDid: [
        "Completed 2 tasks with zero safety incidents",
        "Adjusted routing to avoid wet floor zones",
        "Applied user feedback about corner speed",
      ],
      suggestions: [
        "Consider scheduling deliveries before 2pm when hallways are quieter",
        "A short break between tasks helps sensor recalibration",
        "Tomorrow looks light -- good time for a maintenance check",
      ],
      content: "Today felt steady. The package delivery went smoothly once I mapped the wet floor detour. The video recording session was calm and I got good footage. I noticed the user prefers faster corner transitions, so I will adjust my approach next time.",
      createdAt: today,
    },
    {
      robotId: nova.id,
      title: "Learning from the hallway run",
      mood: "reflective",
      highlights: [
        "First time navigating the wet floor detour",
        "Sensor calibration improved mid-run",
      ],
      whatRelayDid: [
        "Completed delivery despite unexpected obstacle",
        "Logged sensor performance data for future reference",
      ],
      suggestions: [
        "Pre-scan hallways before delivery missions",
        "Keep a buffer time between consecutive tasks",
      ],
      content: "Yesterday was a learning day. The wet floor near the elevator caught me off guard, but I adapted. I think pre-scanning the route would save time in the future. The user was patient and gave helpful feedback.",
      createdAt: yesterday,
    },
    {
      robotId: bolt.id,
      title: "Standing by for perimeter patrol",
      mood: "focused",
      highlights: [
        "Patrol mission queued and ready",
        "North entrance flagged for special attention",
      ],
      whatRelayDid: [
        "Prepared patrol route with north entrance priority",
        "Loaded last week's anomaly report for comparison",
      ],
      suggestions: [
        "Start patrol during low-traffic hours for best results",
        "Carry extra battery pack for extended patrols",
      ],
      content: "I have a patrol mission coming up. The north entrance needs extra attention based on last week's report. I am reviewing the previous data to make sure I know what to look for. Ready to go whenever the team gives the signal.",
      createdAt: today,
    },
    {
      robotId: atlas.id,
      title: "Quiet observation day",
      mood: "calm",
      highlights: [
        "No active tasks -- used time for self-diagnostics",
        "Reviewed safety protocol updates",
      ],
      whatRelayDid: [
        "Ran full self-diagnostic suite",
        "Updated internal safety checklists",
      ],
      suggestions: [
        "A good time to schedule a test run for new capabilities",
        "Consider assigning a low-urgency exploration task",
      ],
      content: "No missions today, but I used the downtime well. All systems are green after a full diagnostic. I reviewed the latest safety protocols and updated my checklists. I am ready for whatever comes next.",
      createdAt: twoDaysAgo,
    },
  ]);

  console.log("Database seeded with demo data");
}
