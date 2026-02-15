import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { RobotProfile } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { RobotAvatar, PlusAvatar } from "@/components/robot-avatar";
import bgImage from "@assets/image_1771099576030.png";

export default function Home() {
  const { data: robots, isLoading } = useQuery<RobotProfile[]>({
    queryKey: ["/api/robots"],
  });

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "linear-gradient(160deg, hsl(290 60% 94%) 0%, hsl(340 80% 92%) 30%, hsl(20 80% 92%) 60%, hsl(340 60% 97%) 100%)",
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(340 80% 75%) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring" }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
            style={{
              background: "linear-gradient(135deg, rgba(232,121,160,0.15), rgba(192,132,252,0.15))",
              border: "1px solid rgba(232,121,160,0.2)",
            }}
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary tracking-wide uppercase">Robot Companion Console</span>
          </motion.div>
          <h1 className="font-heading text-5xl md:text-6xl font-bold text-foreground leading-tight tracking-tight" data-testid="text-home-title">
            Relay
          </h1>
          <p className="text-muted-foreground mt-3 text-lg max-w-md mx-auto leading-relaxed">
            Technology that understands what you need.
            <br />
            <span className="italic">From human need to robot action.</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Link href="/onboarding">
            <Card className="p-5 hover-elevate cursor-pointer mb-6 border-dashed border-2">
              <div className="flex items-center gap-4">
                <PlusAvatar size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading text-lg font-semibold" data-testid="text-create-robot">Create New Robot</h3>
                  <p className="text-sm text-muted-foreground">Name it, set personality, configure safety</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            </Card>
          </Link>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-md" />
            ))}
          </div>
        ) : robots && robots.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="font-heading text-lg font-semibold mb-3 text-foreground">Your Robots</h2>
            <div className="space-y-3">
              {robots.map((robot, i) => (
                <motion.div
                  key={robot.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                >
                  <Link href={`/console/${robot.id}`}>
                    <Card
                      className="p-5 hover-elevate cursor-pointer"
                      data-testid={`card-robot-${robot.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <RobotAvatar color={robot.avatarColor} size="lg" name={robot.name} />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-heading text-lg font-semibold truncate" data-testid={`text-robot-name-${robot.id}`}>
                            {robot.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs">{robot.mode}</Badge>
                            <Badge variant="outline" className="text-xs">{robot.safetyLevel}</Badge>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="relative rounded-md overflow-hidden mt-8"
          >
            <img src={bgImage} alt="" className="w-full h-48 object-cover opacity-30 rounded-md" />
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-background/80 to-transparent rounded-md">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">Create your first robot companion above</p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12 text-xs text-muted-foreground italic"
        >
          Robots that listen beyond words.
        </motion.div>
      </div>
    </div>
  );
}
