import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { RobotProfile, Run } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Send, Activity, Clock, CheckCircle2, AlertTriangle,
  ChevronRight, Sparkles, Calendar, Settings, Camera,
  Mail, Package, CalendarCheck, Ticket, Zap, Globe, Shield, RefreshCw, Link2, Unlink
} from "lucide-react";
import { motion } from "framer-motion";
import { RobotAvatar } from "@/components/robot-avatar";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import defaultNoahPic from "@assets/Screenshot_2026-02-14_at_1.24.57_PM_1_1771104670920.png";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getVibeMessage(runs: Run[]): string {
  const active = runs.filter(r => r.status === "queued" || r.status === "processing");
  const completed = runs.filter(r => r.status === "complete");
  if (active.length > 2) return "You have a busy day ahead. I'm keeping things focused and efficient.";
  if (active.length > 0) return "A few tasks are in motion. Everything is running smoothly.";
  if (completed.length > 0) return "Things are calm right now. A great time to plan ahead.";
  return "No active tasks yet. Ready whenever you are.";
}

function StatusIcon({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: typeof Clock }> = {
    queued: { color: "text-yellow-600 dark:text-yellow-400", icon: Clock },
    processing: { color: "text-blue-600 dark:text-blue-400", icon: Activity },
    complete: { color: "text-green-600 dark:text-green-400", icon: CheckCircle2 },
    failed: { color: "text-red-600 dark:text-red-400", icon: AlertTriangle },
  };
  const c = config[status] || config.queued;
  const Icon = c.icon;
  return <Icon className={`w-4 h-4 ${c.color}`} />;
}

function NoahProfilePic({ src, size = "lg" }: { src: string; size?: "sm" | "lg" }) {
  const dim = size === "sm" ? "w-10 h-10" : "w-14 h-14 md:w-16 md:h-16";
  return (
    <div className={`${dim} rounded-full overflow-hidden shrink-0 ring-2 ring-purple-400/30`}>
      <img
        src={src}
        alt="Noah"
        className="w-full h-full object-cover"
        data-testid="img-noah-avatar"
      />
    </div>
  );
}

function SettingsDialog({ prefs, updatePrefs }: { prefs: { userName: string; noahPicUrl: string | null }; updatePrefs: (u: Partial<{ userName: string; noahPicUrl: string | null }>) => void }) {
  const [open, setOpen] = useState(false);
  const [nameInput, setNameInput] = useState(prefs.userName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    updatePrefs({ userName: nameInput.trim() });
    setOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updatePrefs({ noahPicUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleResetPic = () => {
    updatePrefs({ noahPicUrl: null });
  };

  const currentPic = prefs.noahPicUrl || defaultNoahPic;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setNameInput(prefs.userName); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Preferences" data-testid="button-settings">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <Label htmlFor="userName">Your Name</Label>
            <Input
              id="userName"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Enter your name"
              data-testid="input-user-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Noah's Profile Picture</Label>
            <div className="flex items-center gap-4">
              <NoahProfilePic src={currentPic} size="lg" />
              <div className="space-y-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  data-testid="input-noah-pic"
                />
                <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} data-testid="button-change-photo">
                  <Camera className="w-4 h-4" />
                  Change photo
                </Button>
                {prefs.noahPicUrl && (
                  <Button variant="ghost" className="text-xs text-muted-foreground" onClick={handleResetPic} data-testid="button-reset-pic">
                    Reset to default
                  </Button>
                )}
              </div>
            </div>
          </div>
          <Button className="w-full btn-gradient" onClick={handleSave} data-testid="button-save-prefs">
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  status: string;
}

interface CalendarBlock {
  events: CalendarEvent[];
  busyWindows: { start: string; end: string }[];
  freeWindows: { start: string; end: string }[];
}

type EmailCategory = 'delivery' | 'event_invite' | 'reservation' | 'urgent' | 'newsletter' | 'general';

interface EmailSignal {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  category: EmailCategory;
  labels: string[];
}

const CATEGORY_CONFIG: Record<EmailCategory, { icon: typeof Mail; label: string; color: string }> = {
  delivery: { icon: Package, label: "Delivery", color: "text-amber-600 dark:text-amber-400" },
  event_invite: { icon: CalendarCheck, label: "Invite", color: "text-blue-600 dark:text-blue-400" },
  reservation: { icon: Ticket, label: "Reservation", color: "text-purple-600 dark:text-purple-400" },
  urgent: { icon: Zap, label: "Urgent", color: "text-red-600 dark:text-red-400" },
  newsletter: { icon: Globe, label: "Newsletter", color: "text-muted-foreground" },
  general: { icon: Mail, label: "Email", color: "text-muted-foreground" },
};

function formatEventTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function formatRelativeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  } catch {
    return dateStr;
  }
}

interface IntegrationStatus {
  calendar: boolean;
  gmail: boolean;
}

function CalendarCard({ connected }: { connected: boolean }) {
  const { data, isLoading, error, refetch } = useQuery<CalendarBlock>({
    queryKey: ["/api/calendar/events"],
    refetchInterval: 60000,
    enabled: connected,
  });

  const events = data?.events || [];
  const freeWindows = data?.freeWindows || [];
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.end) > now).slice(0, 5);

  if (!connected) {
    return (
      <div className="p-5 rounded-md glass-card" data-testid="card-calendar">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            Schedule
          </h2>
        </div>
        <div className="text-center py-6">
          <Calendar className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">Google Calendar not connected</p>
          <p className="text-xs text-muted-foreground/70 mb-3">Connect to see your schedule and free windows</p>
          <Badge variant="outline" className="text-xs gap-1">
            <Link2 className="w-3 h-3" />
            Set up in Integrations tab
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-md glass-card" data-testid="card-calendar">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Schedule
        </h2>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs gap-1 text-green-600 dark:text-green-400" data-testid="badge-calendar-connected">
            <Link2 className="w-3 h-3" />
            Connected
          </Badge>
          <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Refresh calendar" data-testid="button-refresh-calendar">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <Calendar className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Could not load calendar</p>
        </div>
      ) : upcomingEvents.length > 0 ? (
        <div className="space-y-2">
          {upcomingEvents.map((event) => {
            const isHappening = new Date(event.start) <= now && new Date(event.end) > now;
            return (
              <div
                key={event.id}
                className={`flex items-center gap-3 p-2.5 rounded-md glass-subtle ${isHappening ? "ring-1 ring-primary/30" : ""}`}
                data-testid={`calendar-event-${event.id}`}
              >
                <div className="shrink-0">
                  {isHappening ? (
                    <Activity className="w-4 h-4 text-primary" />
                  ) : (
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.allDay ? "All day" : `${formatEventTime(event.start)} - ${formatEventTime(event.end)}`}
                    {event.location ? ` \u00B7 ${event.location}` : ""}
                  </p>
                </div>
                {isHappening && (
                  <Badge variant="secondary" className="text-xs shrink-0" data-testid={`badge-now-${event.id}`}>Now</Badge>
                )}
              </div>
            );
          })}
          {freeWindows.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Free windows
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {freeWindows.slice(0, 3).map((w, i) => (
                  <Badge key={i} variant="outline" className="text-xs" data-testid={`badge-free-${i}`}>
                    {formatEventTime(w.start)} - {formatEventTime(w.end)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <Calendar className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">No events today</p>
          {freeWindows.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">Your day is wide open</p>
          )}
        </div>
      )}
      <div className="mt-3 pt-2 border-t border-border/30 flex items-start gap-1.5">
        <Shield className="w-3 h-3 text-muted-foreground/50 mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground/60">
          We only use your schedule blocks to plan support moments. No event details are stored.
        </p>
      </div>
    </div>
  );
}

function EmailSignalsCard({ connected }: { connected: boolean }) {
  const { data, isLoading, error, refetch } = useQuery<EmailSignal[]>({
    queryKey: ["/api/email/signals"],
    refetchInterval: 120000,
    enabled: connected,
  });

  const signals = data || [];
  const actionable = signals.filter(s => s.category !== 'newsletter' && s.category !== 'general');
  const displayed = actionable.length > 0 ? actionable.slice(0, 5) : signals.slice(0, 3);

  if (!connected) {
    return (
      <div className="p-5 rounded-md glass-card" data-testid="card-email-signals">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Mail className="w-5 h-5 text-muted-foreground" />
            Email Signals
          </h2>
        </div>
        <div className="text-center py-6">
          <Mail className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">Gmail not connected</p>
          <p className="text-xs text-muted-foreground/70 mb-3">Connect to detect actionable email signals</p>
          <Badge variant="outline" className="text-xs gap-1">
            <Link2 className="w-3 h-3" />
            Set up in Integrations tab
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-md glass-card" data-testid="card-email-signals">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          Email Signals
        </h2>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs gap-1 text-green-600 dark:text-green-400" data-testid="badge-gmail-connected">
            <Link2 className="w-3 h-3" />
            Connected
          </Badge>
          <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Refresh emails" data-testid="button-refresh-email">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <Mail className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Could not load email signals</p>
        </div>
      ) : displayed.length > 0 ? (
        <div className="space-y-2">
          {displayed.map((signal) => {
            const cat = CATEGORY_CONFIG[signal.category as EmailCategory] || CATEGORY_CONFIG.general;
            const CatIcon = cat.icon;
            return (
              <div
                key={signal.id}
                className="flex items-start gap-3 p-2.5 rounded-md glass-subtle"
                data-testid={`email-signal-${signal.id}`}
              >
                <div className="shrink-0 mt-0.5">
                  <CatIcon className={`w-4 h-4 ${cat.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{signal.from}</p>
                    <Badge variant="secondary" className="text-xs shrink-0">{cat.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{signal.subject}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">{formatRelativeDate(signal.date)}</p>
                </div>
              </div>
            );
          })}
          {actionable.length === 0 && signals.length > 0 && (
            <p className="text-xs text-muted-foreground text-center py-1">No actionable signals detected</p>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <Mail className="w-6 h-6 text-muted-foreground/30 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">No recent email signals</p>
        </div>
      )}
      <div className="mt-3 pt-2 border-t border-border/30 flex items-start gap-1.5">
        <Shield className="w-3 h-3 text-muted-foreground/50 mt-0.5 shrink-0" />
        <p className="text-[10px] text-muted-foreground/60">
          We only extract intent signals (time, location, action needed). We don't store raw email content.
        </p>
      </div>
    </div>
  );
}

function ConnectionsCard({ status }: { status: IntegrationStatus }) {
  return (
    <div className="p-5 rounded-md glass-card" data-testid="card-connections">
      <h2 className="font-heading text-lg font-semibold flex items-center gap-2 mb-4">
        <Link2 className="w-5 h-5 text-primary" />
        Connections
      </h2>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-md glass-subtle" data-testid="connection-calendar">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Google Calendar</p>
              <p className="text-xs text-muted-foreground">Schedule awareness</p>
            </div>
          </div>
          {status.calendar ? (
            <Badge variant="outline" className="text-xs gap-1 text-green-600 dark:text-green-400 shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs gap-1 shrink-0">
              <Unlink className="w-3 h-3" />
              Not connected
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-md glass-subtle" data-testid="connection-gmail">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Gmail</p>
              <p className="text-xs text-muted-foreground">Email signals</p>
            </div>
          </div>
          {status.gmail ? (
            <Badge variant="outline" className="text-xs gap-1 text-green-600 dark:text-green-400 shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs gap-1 shrink-0">
              <Unlink className="w-3 h-3" />
              Not connected
            </Badge>
          )}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-3">
        Manage connections in the Integrations tab of your workspace.
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { prefs, updatePrefs } = useUserPreferences();
  const noahPic = prefs.noahPicUrl || defaultNoahPic;

  const { data: robots, isLoading: robotsLoading } = useQuery<RobotProfile[]>({
    queryKey: ["/api/robots"],
  });

  const { data: allRuns, isLoading: runsLoading } = useQuery<Run[]>({
    queryKey: ["/api/runs"],
  });

  const { data: integrations } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
    refetchInterval: 30000,
  });

  const runs = allRuns || [];
  const inProgressRuns = runs.filter(r => r.status === "queued" || r.status === "processing");
  const recentRuns = runs.slice(0, 4);

  const robotMap = new Map<string, RobotProfile>();
  robots?.forEach(r => robotMap.set(r.id, r));

  const isLoading = robotsLoading || runsLoading;

  const displayName = prefs.userName || "there";
  const today = new Date();
  const isValentines = today.getMonth() === 1 && today.getDate() === 14;

  const chatMessage = isValentines
    ? `Happy Valentine's Day, ${displayName}! I have some plans ready for today. How else can I make you happy?`
    : `${getGreeting()}, ${displayName}! ${isLoading ? "Loading your mission status..." : getVibeMessage(runs)}`;

  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            className="p-5 md:p-6 mb-6 rounded-md glass-card glow-soft"
            data-testid="card-hero"
          >
            <div className="flex items-end justify-end mb-1">
              <SettingsDialog prefs={prefs} updatePrefs={updatePrefs} />
            </div>
            <div className="flex items-start gap-3 md:gap-4 flex-wrap">
              <NoahProfilePic src={noahPic} size="lg" />
              <div className="flex-1 min-w-0">
                <div
                  className="relative rounded-md rounded-tl-none px-4 py-3 mb-3 glass-subtle"
                  data-testid="card-noah-message"
                >
                  <p className="text-xs font-semibold mb-1" data-testid="text-noah-name">Noah</p>
                  <p className="text-sm" data-testid="text-noah-greeting">{chatMessage}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link href="/command">
                    <Button
                      className="gap-2 btn-gradient"
                      data-testid="button-send-task"
                    >
                      <Send className="w-4 h-4" />
                      Send a task
                    </Button>
                  </Link>
                  <Link href="/runs">
                    <Button variant="outline" className="gap-2" data-testid="button-view-runs">
                      <Activity className="w-4 h-4" />
                      View runs
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div
            className="lg:col-span-2 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <div className="p-5 rounded-md glass-card" data-testid="card-in-progress">
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  In Progress
                </h2>
                {inProgressRuns.length > 0 && (
                  <Badge variant="secondary">{inProgressRuns.length} active</Badge>
                )}
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-md" />
                  ))}
                </div>
              ) : inProgressRuns.length > 0 ? (
                <div className="space-y-2">
                  {inProgressRuns.map((run) => {
                    const robot = robotMap.get(run.robotId);
                    return (
                      <Link key={run.id} href={`/run/${run.id}`}>
                        <div
                          className="flex items-center gap-3 p-3 rounded-md hover-elevate cursor-pointer glass-subtle"
                          data-testid={`row-task-${run.id}`}
                        >
                          <StatusIcon status={run.status} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{run.command}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-muted-foreground capitalize">{run.status}</span>
                              {robot && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <RobotAvatar color={robot.avatarColor} size="sm" name={robot.name} />
                                  {robot.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Activity className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No active tasks right now</p>
                  <Link href="/command">
                    <Button variant="outline" className="mt-3 gap-2" data-testid="button-send-first-task">
                      <Send className="w-3.5 h-3.5" />
                      Send a task
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            <div className="p-5 rounded-md glass-card" data-testid="card-recent-runs">
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Recent Runs
                </h2>
                <Link href="/runs">
                  <Button variant="ghost" className="text-xs gap-1" data-testid="button-all-runs">
                    View all
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-md" />
                  ))}
                </div>
              ) : recentRuns.length > 0 ? (
                <div className="space-y-2">
                  {recentRuns.map((run) => {
                    const robot = robotMap.get(run.robotId);
                    const summary = run.aiSummary as any;
                    const riskFlags = summary?.risk_flags || [];
                    return (
                      <Link key={run.id} href={`/run/${run.id}`}>
                        <div
                          className="flex items-center gap-3 p-3 rounded-md hover-elevate cursor-pointer"
                          data-testid={`row-recent-${run.id}`}
                        >
                          <StatusIcon status={run.status} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{run.command}</p>
                            {summary && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {summary.run_summary?.slice(0, 80)}...
                              </p>
                            )}
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {robot && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <RobotAvatar color={robot.avatarColor} size="sm" name={robot.name} />
                                  {robot.name}
                                </Badge>
                              )}
                              {riskFlags.filter((f: string) => f !== "Standard operational risk").map((flag: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  {flag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No runs yet</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <ConnectionsCard status={integrations || { calendar: false, gmail: false }} />

            <CalendarCard connected={integrations?.calendar ?? false} />

            <EmailSignalsCard connected={integrations?.gmail ?? false} />

          </motion.div>
        </div>
      </div>
    </div>
  );
}
