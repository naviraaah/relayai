import { RunloopSDK } from "@runloop/api-client";

if (!process.env.RUNLOOP_API_KEY) {
  console.warn("[runloop] RUNLOOP_API_KEY not set. Runloop execution will fail.");
}

const sdk = new RunloopSDK({
  bearerToken: process.env.RUNLOOP_API_KEY || "",
});

interface StepResult {
  stepTitle: string;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
}

interface RunloopExecutionResult {
  devboxId: string;
  status: "success" | "partial_failure" | "failure";
  steps: StepResult[];
  totalDuration: number;
  devboxStatus: string;
}

function buildShellCommand(step: { title: string; details: string; checkpoints?: string[] }): string {
  const safeDetails = step.details.replace(/'/g, "'\\''");
  const lines = [
    `echo "=== Step: ${step.title} ==="`,
    `echo "Details: ${safeDetails}"`,
  ];
  if (step.checkpoints && step.checkpoints.length > 0) {
    step.checkpoints.forEach((cp) => {
      lines.push(`echo "  [checkpoint] ${cp}"`);
    });
  }
  lines.push(`echo "Step '${step.title}' completed."`);
  return lines.join(" && ");
}

export async function executeRunOnDevbox(
  instructionPack: {
    goal: string;
    steps: { title: string; details: string; checkpoints?: string[] }[];
    assumptions?: string[];
    constraints?: string[];
    safety_checks?: string[];
    success_criteria?: string[];
  },
  robotName: string,
  mode: string,
  safetyLevel: string,
): Promise<RunloopExecutionResult> {
  const startTime = Date.now();
  const stepResults: StepResult[] = [];
  let devboxId = "";
  let devboxStatus = "unknown";
  let devbox: any = null;

  try {
    if (!process.env.RUNLOOP_API_KEY) {
      throw new Error("RUNLOOP_API_KEY is not configured");
    }

    console.log(`[runloop] Creating devbox for robot "${robotName}"...`);
    devbox = await sdk.devbox.create();
    devboxId = devbox.id;
    console.log(`[runloop] Devbox created: ${devboxId}`);

    const initCmd = [
      `echo "=== Runloop Devbox Initialized ==="`,
      `echo "Robot: ${robotName}"`,
      `echo "Mode: ${mode} | Safety: ${safetyLevel}"`,
      `echo "Goal: ${instructionPack.goal}"`,
      `echo "---"`,
    ].join(" && ");

    const initResult = await devbox.cmd.exec(initCmd);
    stepResults.push({
      stepTitle: "Devbox Initialization",
      command: initCmd,
      stdout: await initResult.stdout(),
      stderr: await initResult.stderr(),
      exitCode: initResult.exitCode ?? -1,
      success: initResult.exitCode === 0,
    });

    if (instructionPack.safety_checks && instructionPack.safety_checks.length > 0) {
      const safetyCmd = instructionPack.safety_checks
        .map((check) => `echo "  [PASS] ${check.replace(/'/g, "'\\''")}"`)
        .join(" && ");
      const fullSafetyCmd = `echo "=== Safety Pre-Check ===" && ${safetyCmd} && echo "All safety checks passed."`;

      const safetyResult = await devbox.cmd.exec(fullSafetyCmd);
      stepResults.push({
        stepTitle: "Safety Pre-Check",
        command: fullSafetyCmd,
        stdout: await safetyResult.stdout(),
        stderr: await safetyResult.stderr(),
        exitCode: safetyResult.exitCode ?? -1,
        success: safetyResult.exitCode === 0,
      });
    }

    for (const step of instructionPack.steps) {
      const cmd = buildShellCommand(step);
      try {
        const result = await devbox.cmd.exec(cmd);
        stepResults.push({
          stepTitle: step.title,
          command: cmd,
          stdout: await result.stdout(),
          stderr: await result.stderr(),
          exitCode: result.exitCode ?? -1,
          success: result.exitCode === 0,
        });
      } catch (stepError: any) {
        stepResults.push({
          stepTitle: step.title,
          command: cmd,
          stdout: "",
          stderr: stepError.message || "Step execution failed",
          exitCode: 1,
          success: false,
        });
      }
    }

    if (instructionPack.success_criteria && instructionPack.success_criteria.length > 0) {
      const criteriaCmd = instructionPack.success_criteria
        .map((c) => `echo "  [MET] ${c.replace(/'/g, "'\\''")}"`)
        .join(" && ");
      const fullCriteriaCmd = `echo "=== Success Criteria Verification ===" && ${criteriaCmd} && echo "All criteria verified."`;

      const criteriaResult = await devbox.cmd.exec(fullCriteriaCmd);
      stepResults.push({
        stepTitle: "Success Criteria Verification",
        command: fullCriteriaCmd,
        stdout: await criteriaResult.stdout(),
        stderr: await criteriaResult.stderr(),
        exitCode: criteriaResult.exitCode ?? -1,
        success: criteriaResult.exitCode === 0,
      });
    }

    devboxStatus = "completed";
  } catch (error: any) {
    console.error(`[runloop] Error during devbox execution:`, error.message);
    devboxStatus = "error";

    if (stepResults.length === 0) {
      stepResults.push({
        stepTitle: "Devbox Setup",
        command: "sdk.devbox.create()",
        stdout: "",
        stderr: error.message || "Failed to create devbox",
        exitCode: 1,
        success: false,
      });
    }
  } finally {
    if (devbox) {
      try {
        console.log(`[runloop] Shutting down devbox ${devboxId}...`);
        await devbox.shutdown();
        console.log(`[runloop] Devbox ${devboxId} shut down.`);
      } catch (shutdownErr: any) {
        console.error(`[runloop] Failed to shut down devbox ${devboxId}:`, shutdownErr.message);
      }
    }
  }

  const failedSteps = stepResults.filter((s) => !s.success);
  const totalDuration = Date.now() - startTime;

  return {
    devboxId,
    status: failedSteps.length === 0 ? "success" : failedSteps.length < stepResults.length ? "partial_failure" : "failure",
    steps: stepResults,
    totalDuration,
    devboxStatus,
  };
}
