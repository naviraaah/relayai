import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Trash2, Plus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Conversation, Message } from "@shared/schema";

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: isOpen,
  });

  const { data: activeConversation } = useQuery<ConversationWithMessages>({
    queryKey: ["/api/conversations", activeConversationId],
    enabled: !!activeConversationId && isOpen,
  });

  const displayMessages = activeConversation?.messages || [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, activeConversationId]);

  const createConversation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/conversations", { title: "New Chat" });
      return res.json();
    },
    onSuccess: (data: Conversation) => {
      setActiveConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      if (activeConversationId) {
        setActiveConversationId(null);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !activeConversationId || isStreaming) return;

    const userMessage = input.trim();
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    queryClient.setQueryData<ConversationWithMessages>(
      ["/api/conversations", activeConversationId],
      (old) => {
        if (!old) return old;
        return {
          ...old,
          messages: [
            ...old.messages,
            { id: -1, conversationId: activeConversationId, role: "user", content: userMessage, createdAt: new Date() } as Message,
          ],
        };
      }
    );

    try {
      const response = await fetch(`/api/conversations/${activeConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage }),
        credentials: "include",
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) {
                streamDone = true;
                break;
              }
              if (data.error) {
                streamDone = true;
                break;
              }
              if (data.content) {
                accumulated += data.content;
                setStreamingContent(accumulated);
              }
            } catch {}
          }
        }
      }

      setStreamingContent("");
      setIsStreaming(false);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", activeConversationId] });
    } catch (error) {
      console.error("Chat error:", error);
      setStreamingContent("");
      setIsStreaming(false);
    }
  }, [input, activeConversationId, isStreaming, queryClient]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleNewChat = () => {
    createConversation.mutate();
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!conversations?.length) {
      createConversation.mutate();
    } else if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-4 z-50 w-[360px] max-h-[520px] flex flex-col rounded-md glass glow-soft overflow-hidden"
            style={{ boxShadow: "0 8px 32px rgba(140, 120, 200, 0.15)" }}
            data-testid="chat-widget-panel"
          >
            <div
              className="flex items-center justify-between gap-2 px-4 py-3"
              style={{
                background: "linear-gradient(135deg, hsl(270 55% 58%), hsl(280 50% 65%), hsl(300 40% 65%))",
                borderBottom: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Relay Assistant</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleNewChat}
                  className="text-white/80 border-transparent"
                  data-testid="button-new-chat"
                >
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 border-transparent"
                  data-testid="button-close-chat"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {conversations && conversations.length > 1 && !activeConversationId && (
              <div className="p-2 border-b border-border/30 max-h-36 overflow-y-auto">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate cursor-pointer"
                    onClick={() => setActiveConversationId(conv.id)}
                    data-testid={`chat-conversation-${conv.id}`}
                  >
                    <span className="text-sm truncate">{conv.title}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation.mutate(conv.id);
                      }}
                      data-testid={`button-delete-chat-${conv.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[280px]">
              {displayMessages.length === 0 && !streamingContent && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                    style={{ background: "linear-gradient(135deg, hsl(270 55% 58%), hsl(300 40% 65%))" }}
                  >
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-medium mb-1">How can I help?</p>
                  <p className="text-xs text-muted-foreground">
                    Ask about your robots, tasks, journal entries, or support plans.
                  </p>
                </div>
              )}

              {displayMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`chat-message-${msg.id}`}
                >
                  <div
                    className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                      msg.role === "user"
                        ? "text-white"
                        : "glass-subtle"
                    }`}
                    style={
                      msg.role === "user"
                        ? { background: "linear-gradient(135deg, hsl(270 55% 58%), hsl(280 50% 65%))" }
                        : undefined
                    }
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}

              {streamingContent && (
                <div className="flex justify-start" data-testid="chat-streaming-message">
                  <div className="max-w-[85%] rounded-md px-3 py-2 text-sm glass-subtle">
                    <p className="whitespace-pre-wrap leading-relaxed">{streamingContent}</p>
                  </div>
                </div>
              )}

              {isStreaming && !streamingContent && (
                <div className="flex justify-start">
                  <div className="rounded-md px-3 py-2 glass-subtle">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-border/30">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask something..."
                  rows={1}
                  className="flex-1 resize-none rounded-md border border-border/50 bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  data-testid="input-chat-message"
                />
                <Button
                  size="icon"
                  onClick={sendMessage}
                  disabled={!input.trim() || isStreaming || !activeConversationId}
                  style={{ background: "linear-gradient(135deg, hsl(270 55% 58%), hsl(280 50% 65%))" }}
                  className="text-white shrink-0"
                  data-testid="button-send-chat"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => (isOpen ? setIsOpen(false) : handleOpen())}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg"
        style={{
          background: "linear-gradient(135deg, hsl(270 55% 58%), hsl(280 50% 65%), hsl(300 40% 65%))",
          boxShadow: "0 4px 20px rgba(140, 120, 200, 0.3)",
        }}
        data-testid="button-toggle-chat"
      >
        {isOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </motion.button>
    </>
  );
}
