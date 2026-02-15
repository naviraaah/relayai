import { useQuery } from "@tanstack/react-query";
import type { RobotProfile, JournalEntry } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Smile, CloudRain, Zap, Eye, Heart,
  Lightbulb, CheckCircle2, ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";
import { RobotAvatar } from "@/components/robot-avatar";
import { useState } from "react";

const moodConfig: Record<string, { icon: typeof Smile; color: string; label: string }> = {
  content: { icon: Heart, color: "text-green-600 dark:text-green-400", label: "Content" },
  reflective: { icon: Eye, color: "text-blue-600 dark:text-blue-400", label: "Reflective" },
  focused: { icon: Zap, color: "text-yellow-600 dark:text-yellow-400", label: "Focused" },
  calm: { icon: CloudRain, color: "text-cyan-600 dark:text-cyan-400", label: "Calm" },
  neutral: { icon: Smile, color: "text-muted-foreground", label: "Neutral" },
};

export default function Journal() {
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

  const { data: entries, isLoading: entriesLoading } = useQuery<JournalEntry[]>({
    queryKey: ["/api/journal"],
  });

  const { data: robots } = useQuery<RobotProfile[]>({
    queryKey: ["/api/robots"],
  });

  const robotMap = new Map<string, RobotProfile>();
  robots?.forEach(r => robotMap.set(r.id, r));

  const activeEntry = selectedEntry
    ? entries?.find(e => e.id === selectedEntry)
    : entries?.[0];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2" data-testid="text-journal-title">
          <BookOpen className="w-6 h-6 text-primary" />
          Relay Journal
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Daily reflections and insights from your robot companions
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <motion.div
          className="lg:col-span-2 space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {entriesLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-md" />
            ))
          ) : entries && entries.length > 0 ? (
            entries.map((entry, i) => {
              const robot = robotMap.get(entry.robotId);
              const mood = moodConfig[entry.mood] || moodConfig.neutral;
              const MoodIcon = mood.icon;
              const isActive = (selectedEntry ? entry.id === selectedEntry : i === 0);

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div
                    className={`p-4 cursor-pointer transition-all rounded-md ${
                      isActive ? "ring-2 ring-primary/30 glass-card glow-soft" : "glass-subtle hover-elevate"
                    }`}
                    onClick={() => setSelectedEntry(entry.id)}
                    data-testid={`card-journal-${entry.id}`}
                  >
                    <div className="flex items-start gap-3">
                      {robot && (
                        <RobotAvatar color={robot.avatarColor} size="sm" name={robot.name} />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entry.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-xs ${mood.color}`}>
                            <MoodIcon className="w-3 h-3" />
                            {mood.label}
                          </span>
                          {robot && (
                            <span className="text-xs text-muted-foreground">{robot.name}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : ""}
                          </span>
                        </div>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="p-8 text-center rounded-md glass-card">
              <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No journal entries yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your robots will start writing here after completing tasks
              </p>
            </div>
          )}
        </motion.div>

        <motion.div
          className="lg:col-span-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {activeEntry ? (
            <JournalDetail entry={activeEntry} robot={robotMap.get(activeEntry.robotId)} />
          ) : (
            <div className="p-8 text-center h-full flex items-center justify-center rounded-md glass-card">
              <div>
                <BookOpen className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground">Select an entry to read</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function JournalDetail({ entry, robot }: { entry: JournalEntry; robot?: RobotProfile }) {
  const mood = moodConfig[entry.mood] || moodConfig.neutral;
  const MoodIcon = mood.icon;

  return (
    <div className="p-6 rounded-md glass-card" data-testid="journal-detail">
      <div className="flex items-start gap-3 mb-5">
        {robot && <RobotAvatar color={robot.avatarColor} size="md" name={robot.name} />}
        <div className="flex-1 min-w-0">
          <h2 className="font-heading text-xl font-semibold" data-testid="text-journal-entry-title">
            {entry.title}
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-sm ${mood.color}`}>
              <MoodIcon className="w-4 h-4" />
              {mood.label}
            </span>
            {robot && <Badge variant="outline" className="text-xs">{robot.name}</Badge>}
            <span className="text-xs text-muted-foreground">
              {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }) : ""}
            </span>
          </div>
        </div>
      </div>

      {entry.content && (
        <div className="mb-5 p-4 rounded-md glass-subtle italic text-sm leading-relaxed" data-testid="text-journal-content">
          "{entry.content}"
        </div>
      )}

      {entry.highlights && (entry.highlights as string[]).length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Highlights
          </h3>
          <ul className="space-y-1.5">
            {(entry.highlights as string[]).map((h, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entry.whatRelayDid && (entry.whatRelayDid as string[]).length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-blue-500" />
            What Relay Did
          </h3>
          <ul className="space-y-1.5">
            {(entry.whatRelayDid as string[]).map((w, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {entry.suggestions && (entry.suggestions as string[]).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            Suggestions
          </h3>
          <ul className="space-y-1.5">
            {(entry.suggestions as string[]).map((s, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
