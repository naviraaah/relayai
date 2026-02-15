import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { RobotProfile } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot, Plus, Trash2, Terminal, Pencil, Check, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { RobotAvatar, PlusAvatar } from "@/components/robot-avatar";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Robots() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const { data: robots, isLoading } = useQuery<RobotProfile[]>({
    queryKey: ["/api/robots"],
  });

  const deleteRobot = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/robots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/robots"] });
      setDeleteConfirmId(null);
      toast({ title: "Robot deleted", description: "The robot has been removed." });
    },
  });

  const updateRobot = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await apiRequest("PATCH", `/api/robots/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/robots"] });
      setEditingId(null);
      toast({ title: "Name updated", description: "Robot name has been changed." });
    },
  });

  function startEditing(robot: RobotProfile) {
    setEditingId(robot.id);
    setEditName(robot.name);
    setDeleteConfirmId(null);
  }

  function saveEdit(id: string) {
    const trimmed = editName.trim();
    if (trimmed.length === 0) return;
    updateRobot.mutate({ id, name: trimmed });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2" data-testid="text-robots-title">
          <Bot className="w-6 h-6 text-primary" />
          Your Robots
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your robot companions
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Link href="/onboarding">
          <div className="p-5 hover-elevate cursor-pointer mb-4 rounded-md glass-card" style={{ border: "2px dashed rgba(180, 160, 240, 0.25)" }} data-testid="card-add-robot">
            <div className="flex items-center gap-4">
              <PlusAvatar size="lg" />
              <div className="flex-1 min-w-0">
                <h3 className="font-heading text-lg font-semibold">Create New Robot</h3>
                <p className="text-sm text-muted-foreground">Name it, set personality, configure safety</p>
              </div>
              <Plus className="w-5 h-5 text-muted-foreground shrink-0" />
            </div>
          </div>
        </Link>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))}
        </div>
      ) : robots && robots.length > 0 ? (
        <div className="space-y-3">
          {robots.map((robot, i) => (
            <motion.div
              key={robot.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06 }}
            >
              <div
                className="p-5 rounded-md glass-card"
                data-testid={`card-robot-${robot.id}`}
              >
                <div className="flex items-center gap-4">
                  <RobotAvatar color={robot.avatarColor} size="lg" name={robot.name} />
                  <div className="flex-1 min-w-0">
                    {editingId === robot.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(robot.id);
                            if (e.key === "Escape") cancelEdit();
                          }}
                          className="font-heading text-lg font-semibold"
                          autoFocus
                          data-testid={`input-edit-name-${robot.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => saveEdit(robot.id)}
                          disabled={!editName.trim() || updateRobot.isPending}
                          data-testid={`button-save-name-${robot.id}`}
                        >
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelEdit}
                          data-testid={`button-cancel-edit-${robot.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading text-lg font-semibold truncate" data-testid={`text-robot-name-${robot.id}`}>
                          {robot.name}
                        </h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => startEditing(robot)}
                          data-testid={`button-edit-name-${robot.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <Badge variant="secondary" className="text-xs">{robot.mode}</Badge>
                      <Badge variant="outline" className="text-xs">{robot.safetyLevel}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link href={`/console/${robot.id}`}>
                      <Button variant="ghost" size="icon" data-testid={`button-console-${robot.id}`}>
                        <Terminal className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(deleteConfirmId === robot.id ? null : robot.id)}
                      data-testid={`button-delete-${robot.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                <AnimatePresence>
                  {deleteConfirmId === robot.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t"
                    >
                      <p className="text-sm text-muted-foreground mb-2">
                        Delete {robot.name} and all its data? This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          onClick={() => deleteRobot.mutate(robot.id)}
                          disabled={deleteRobot.isPending}
                          data-testid={`button-confirm-delete-${robot.id}`}
                        >
                          {deleteRobot.isPending ? "Deleting..." : "Delete"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setDeleteConfirmId(null)}
                          data-testid={`button-cancel-delete-${robot.id}`}
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-md glass-card">
          <Bot className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">No robots yet</h3>
          <p className="text-sm text-muted-foreground">Create your first robot companion above</p>
        </div>
      )}
    </div>
  );
}
