import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { chatStorage } from "./storage";
import { storage } from "../../storage";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function buildSystemPrompt(): Promise<string> {
  const robots = await storage.getAllRobots();
  const runs = await storage.getAllRuns();
  const journal = await storage.getJournalEntries();

  const recentRuns = runs.slice(0, 10);
  const recentJournal = journal.slice(0, 5);
  const activeRuns = runs.filter(r => r.status === "queued" || r.status === "processing");
  const completedRuns = runs.filter(r => r.status === "complete");

  let context = `You are Relay Assistant, a helpful and calm AI companion inside the Relay robot companion console. You help users understand their robot operations, plan tasks, review run results, and make decisions about their robots.

You have access to the following live data from the system:

ROBOTS (${robots.length} total):
${robots.map(r => `- ${r.name} (mode: ${r.mode}, safety: ${r.safetyLevel})`).join("\n")}

ACTIVE TASKS (${activeRuns.length}):
${activeRuns.length > 0 ? activeRuns.map(r => `- "${r.command}" (status: ${r.status}, urgency: ${r.urgency})`).join("\n") : "No active tasks right now."}

RECENT RUNS (last ${recentRuns.length}):
${recentRuns.map(r => {
  const summary = r.aiSummary as any;
  return `- "${r.command}" — ${r.status}${summary?.run_summary ? ` | Summary: ${summary.run_summary.slice(0, 100)}` : ""}`;
}).join("\n")}

JOURNAL ENTRIES (last ${recentJournal.length}):
${recentJournal.map(j => `- "${j.title}" (mood: ${j.mood})${j.suggestions && (j.suggestions as string[]).length > 0 ? ` | Suggestion: ${(j.suggestions as string[])[0]}` : ""}`).join("\n")}

STATS:
- Total completed runs: ${completedRuns.length}
- Total robots: ${robots.length}

Guidelines:
- Be warm, supportive, and concise
- Help users prioritize tasks and understand robot performance
- Suggest improvements based on run history and journal insights
- If asked about support plans, reference the daily micro-actions (walks, hydration, meeting prep)
- Keep responses focused and actionable
- Use simple language, avoid jargon`;

  return context;
}

export function registerChatRoutes(app: Express): void {
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      if (typeof title !== "undefined" && typeof title !== "string") {
        return res.status(400).json({ error: "Title must be a string" });
      }
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      if (!content || typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ error: "Content is required" });
      }

      await chatStorage.createMessage(conversationId, "user", content.trim());

      const msgHistory = await chatStorage.getMessagesByConversation(conversationId);
      const systemPrompt = await buildSystemPrompt();

      const chatMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
        ...msgHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: chatMessages,
        stream: true,
        max_tokens: 1024,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}
