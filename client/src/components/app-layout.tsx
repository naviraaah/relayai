import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { RobotProfile } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Send, Activity, BookOpen, Bot, Menu, X
} from "lucide-react";
import { RobotAvatar } from "@/components/robot-avatar";
import { useState } from "react";
import logoImage from "@assets/RELAY-_Clarity_for_human_and_machine._1771102909875.png";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/command", label: "Command", icon: Send },
  { path: "/runs", label: "Runs", icon: Activity },
  { path: "/journal", label: "Journal", icon: BookOpen },
  { path: "/robots", label: "Robots", icon: Bot },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: robots } = useQuery<RobotProfile[]>({
    queryKey: ["/api/robots"],
  });

  const activeRobot = robots?.[0];

  return (
    <div className="min-h-screen iridescent-bg">
      <header className="sticky top-0 z-50 glass" style={{ borderBottom: "1px solid rgba(180, 160, 240, 0.12)" }}>
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-4 h-14">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer" data-testid="link-logo">
                <img src={logoImage} alt="Relay" className="w-8 h-8 rounded-full object-cover" />
                <span className="font-heading text-xl font-bold tracking-tight">
                  Relay
                </span>
              </div>
            </Link>

            {activeRobot && (
              <Link href={`/command`}>
                <div
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer hover-elevate glass-subtle"
                  data-testid="pill-active-robot"
                >
                  <RobotAvatar color={activeRobot.avatarColor} size="sm" name={activeRobot.name} />
                  <span className="text-sm font-medium">{activeRobot.name}</span>
                </div>
              </Link>
            )}
          </div>

          <nav className="hidden md:flex items-center gap-1" data-testid="nav-desktop">
            {navItems.map((item) => {
              const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
              const Icon = item.icon;
              return (
                <Link key={item.path} href={item.path}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className="gap-2 text-sm"
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden px-4 pb-3 pt-2 glass" style={{ borderTop: "1px solid rgba(180, 160, 240, 0.08)" }}>
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className="w-full justify-start gap-2 text-sm"
                      onClick={() => setMobileMenuOpen(false)}
                      data-testid={`nav-mobile-${item.label.toLowerCase()}`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main>{children}</main>
    </div>
  );
}
