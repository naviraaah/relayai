import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const robotProfiles = pgTable("robot_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  mode: text("mode").notNull().default("calm"),
  safetyLevel: text("safety_level").notNull().default("balanced"),
  avatarColor: text("avatar_color").notNull().default("#e879a0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const runs = pgTable("runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  robotId: varchar("robot_id").notNull(),
  command: text("command").notNull(),
  context: text("context"),
  urgency: integer("urgency").notNull().default(50),
  status: text("status").notNull().default("queued"),
  instructionPack: jsonb("instruction_pack"),
  videoUrl: text("video_url"),
  aiSummary: jsonb("ai_summary"),
  userRating: text("user_rating"),
  userFeedback: text("user_feedback"),
  improvedPlan: jsonb("improved_plan"),
  devboxId: text("devbox_id"),
  runloopOutput: jsonb("runloop_output"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRobotProfileSchema = createInsertSchema(robotProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertRunSchema = createInsertSchema(runs).omit({
  id: true,
  createdAt: true,
  status: true,
  instructionPack: true,
  aiSummary: true,
  improvedPlan: true,
  devboxId: true,
  runloopOutput: true,
});

export type InsertRobotProfile = z.infer<typeof insertRobotProfileSchema>;
export type RobotProfile = typeof robotProfiles.$inferSelect;
export type InsertRun = z.infer<typeof insertRunSchema>;
export type Run = typeof runs.$inferSelect;

export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  robotId: varchar("robot_id").notNull(),
  title: text("title").notNull(),
  mood: text("mood").notNull().default("neutral"),
  highlights: text("highlights").array().notNull().default(sql`'{}'::text[]`),
  whatRelayDid: text("what_relay_did").array().notNull().default(sql`'{}'::text[]`),
  suggestions: text("suggestions").array().notNull().default(sql`'{}'::text[]`),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  createdAt: true,
});

export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
