import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Shield, Zap, Heart, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RobotAvatar } from "@/components/robot-avatar";
import bgImage from "@assets/image_1771099556934.png";

const AVATAR_COLORS = [
  "#b4a0f0", "#e0b0d0", "#818cf8", "#67e8f9", "#86efac", "#fbbf24",
];

const PERSONALITY_MODES = [
  { value: "calm", label: "Calm & Supportive", icon: Heart, desc: "Gentle, reassuring presence" },
  { value: "direct", label: "Direct & Efficient", icon: Zap, desc: "Fast, clear communication" },
  { value: "professional", label: "Professional & Polite", icon: Sparkles, desc: "Formal, courteous manner" },
];

const SAFETY_LEVELS = [
  { value: "conservative", label: "Conservative", desc: "Asks before acting" },
  { value: "balanced", label: "Balanced", desc: "Smart defaults" },
  { value: "proactive", label: "Proactive", desc: "Suggests actions" },
];

export default function Onboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [mode, setMode] = useState("calm");
  const [safetyLevel, setSafetyLevel] = useState("balanced");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);

  const createRobot = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/robot/create", {
        name,
        mode,
        safetyLevel,
        avatarColor,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/robots"] });
      navigate("/");
    },
  });

  const canProceed = step === 0 ? name.trim().length > 0 : true;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center iridescent-bg">
      <div className="absolute inset-0 z-0 opacity-10">
        <img src={bgImage} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-20 blur-3xl"
        style={{ background: `radial-gradient(circle, ${avatarColor} 0%, transparent 70%)` }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="text-center mb-8">
          <motion.div
            key={`avatar-${avatarColor}-${name}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-block mb-4"
          >
            <RobotAvatar
              color={avatarColor}
              size="xl"
              name={name || "robot"}
              animated
            />
          </motion.div>
          <h1 className="font-heading text-3xl font-bold text-foreground" data-testid="text-onboarding-title">
            {step === 0 ? "Name Your Robot" : step === 1 ? "Set Personality" : "Safety Level"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {step === 0
              ? "Give your companion a name"
              : step === 1
              ? "Choose how your robot communicates"
              : "How should your robot handle decisions?"}
          </p>
        </div>

        <div className="flex gap-2 justify-center mb-6">
          {[0, 1, 2].map((s) => (
            <motion.div
              key={s}
              animate={{
                width: s <= step ? 40 : 24,
                opacity: s <= step ? 1 : 0.4,
              }}
              className="h-1.5 rounded-full"
              style={{
                background: s <= step
                  ? `linear-gradient(90deg, ${avatarColor}, hsl(270 50% 65%))`
                  : "hsl(var(--muted))",
              }}
            />
          ))}
        </div>

        <div className="p-6 rounded-md glass-card glow-soft">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <Label htmlFor="robot-name" className="text-sm font-medium mb-2 block">
                    Robot Name
                  </Label>
                  <Input
                    id="robot-name"
                    data-testid="input-robot-name"
                    placeholder="e.g. Nova, Atlas, Bolt..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-lg"
                    autoFocus
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    Avatar Color
                  </Label>
                  <div className="flex gap-3 flex-wrap">
                    {AVATAR_COLORS.map((color) => (
                      <button
                        key={color}
                        data-testid={`button-color-${color}`}
                        onClick={() => setAvatarColor(color)}
                        className={`w-10 h-10 rounded-full transition-all duration-200 relative ${
                          avatarColor === color
                            ? "ring-2 ring-offset-2 ring-primary scale-110"
                            : "opacity-60"
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${color}, hsl(270 50% 65%))`,
                          boxShadow: avatarColor === color ? `0 0 16px ${color}55` : "none",
                        }}
                      >
                        {avatarColor === color && (
                          <motion.div
                            layoutId="color-ring"
                            className="absolute inset-0 rounded-full"
                            style={{ boxShadow: `0 0 0 2px ${color}` }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {PERSONALITY_MODES.map((m) => {
                  const Icon = m.icon;
                  const isSelected = mode === m.value;
                  return (
                    <button
                      key={m.value}
                      data-testid={`button-mode-${m.value}`}
                      onClick={() => setMode(m.value)}
                      className={`w-full p-4 rounded-md text-left transition-all duration-200 flex items-center gap-4 ${
                        isSelected
                          ? "glass-card ring-2 ring-primary/30"
                          : "glass-subtle"
                      } hover-elevate`}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                        style={{
                          background: isSelected
                            ? `linear-gradient(135deg, ${avatarColor}, hsl(270 50% 65%))`
                            : "hsl(var(--muted))",
                          boxShadow: isSelected ? `0 0 12px ${avatarColor}44` : "none",
                        }}
                      >
                        <Icon className={`w-5 h-5 transition-colors ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{m.label}</div>
                        <div className="text-sm text-muted-foreground">{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {SAFETY_LEVELS.map((s) => {
                  const isSelected = safetyLevel === s.value;
                  return (
                    <button
                      key={s.value}
                      data-testid={`button-safety-${s.value}`}
                      onClick={() => setSafetyLevel(s.value)}
                      className={`w-full p-4 rounded-md text-left transition-all duration-200 flex items-center gap-4 ${
                        isSelected
                          ? "glass-card ring-2 ring-primary/30"
                          : "glass-subtle"
                      } hover-elevate`}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                        style={{
                          background: isSelected
                            ? `linear-gradient(135deg, ${avatarColor}, hsl(270 50% 65%))`
                            : "hsl(var(--muted))",
                          boxShadow: isSelected ? `0 0 12px ${avatarColor}44` : "none",
                        }}
                      >
                        <Shield className={`w-5 h-5 transition-colors ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{s.label}</div>
                        <div className="text-sm text-muted-foreground">{s.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1"
              data-testid="button-back"
            >
              Back
            </Button>
          )}
          {step < 2 ? (
            <Button
              onClick={() => setStep(step + 1)}
              className="flex-1 gap-2"
              disabled={!canProceed}
              data-testid="button-next"
              style={{
                background: canProceed ? `linear-gradient(135deg, ${avatarColor}, hsl(270 50% 55%))` : undefined,
                border: canProceed ? `1px solid ${avatarColor}` : undefined,
              }}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={() => createRobot.mutate()}
              className="flex-1 gap-2"
              disabled={createRobot.isPending}
              data-testid="button-create-robot"
              style={{
                background: `linear-gradient(135deg, ${avatarColor}, hsl(270 50% 55%))`,
                border: `1px solid ${avatarColor}`,
              }}
            >
              {createRobot.isPending ? "Creating..." : "Create Robot"}
              <Sparkles className="w-4 h-4" />
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
