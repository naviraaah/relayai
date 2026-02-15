import {
  type User, type InsertUser,
  type RobotProfile, type InsertRobotProfile,
  type Run, type InsertRun,
  type JournalEntry, type InsertJournalEntry,
  users, robotProfiles, runs, journalEntries,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  createRobot(profile: InsertRobotProfile): Promise<RobotProfile>;
  getRobot(id: string): Promise<RobotProfile | undefined>;
  getAllRobots(): Promise<RobotProfile[]>;
  updateRobot(id: string, updates: Partial<RobotProfile>): Promise<RobotProfile | undefined>;
  deleteRobot(id: string): Promise<boolean>;

  createRun(run: InsertRun): Promise<Run>;
  getRun(id: string): Promise<Run | undefined>;
  getAllRuns(): Promise<Run[]>;
  getRunsByRobot(robotId: string): Promise<Run[]>;
  updateRun(id: string, updates: Partial<Run>): Promise<Run | undefined>;

  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  getJournalEntries(robotId?: string): Promise<JournalEntry[]>;
  getJournalEntry(id: string): Promise<JournalEntry | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createRobot(profile: InsertRobotProfile): Promise<RobotProfile> {
    const [robot] = await db.insert(robotProfiles).values(profile).returning();
    return robot;
  }

  async getRobot(id: string): Promise<RobotProfile | undefined> {
    const [robot] = await db.select().from(robotProfiles).where(eq(robotProfiles.id, id));
    return robot;
  }

  async getAllRobots(): Promise<RobotProfile[]> {
    return db.select().from(robotProfiles).orderBy(desc(robotProfiles.createdAt));
  }

  async updateRobot(id: string, updates: Partial<RobotProfile>): Promise<RobotProfile | undefined> {
    const [updated] = await db.update(robotProfiles).set(updates).where(eq(robotProfiles.id, id)).returning();
    return updated;
  }

  async deleteRobot(id: string): Promise<boolean> {
    await db.delete(runs).where(eq(runs.robotId, id));
    await db.delete(journalEntries).where(eq(journalEntries.robotId, id));
    const [deleted] = await db.delete(robotProfiles).where(eq(robotProfiles.id, id)).returning();
    return !!deleted;
  }

  async createRun(run: InsertRun): Promise<Run> {
    const [created] = await db.insert(runs).values(run).returning();
    return created;
  }

  async getRun(id: string): Promise<Run | undefined> {
    const [run] = await db.select().from(runs).where(eq(runs.id, id));
    return run;
  }

  async getAllRuns(): Promise<Run[]> {
    return db.select().from(runs).orderBy(desc(runs.createdAt));
  }

  async getRunsByRobot(robotId: string): Promise<Run[]> {
    return db.select().from(runs).where(eq(runs.robotId, robotId)).orderBy(desc(runs.createdAt));
  }

  async updateRun(id: string, updates: Partial<Run>): Promise<Run | undefined> {
    const [updated] = await db.update(runs).set(updates).where(eq(runs.id, id)).returning();
    return updated;
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [created] = await db.insert(journalEntries).values(entry).returning();
    return created;
  }

  async getJournalEntries(robotId?: string): Promise<JournalEntry[]> {
    if (robotId) {
      return db.select().from(journalEntries).where(eq(journalEntries.robotId, robotId)).orderBy(desc(journalEntries.createdAt));
    }
    return db.select().from(journalEntries).orderBy(desc(journalEntries.createdAt));
  }

  async getJournalEntry(id: string): Promise<JournalEntry | undefined> {
    const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, id));
    return entry;
  }
}

export const storage = new DatabaseStorage();
