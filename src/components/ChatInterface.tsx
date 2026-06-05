"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Bot, User, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export function ChatInterface({ repoId }: { repoId: string }) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: { repoId },
    onError: (err) => {
      console.error("Chat error:", err);
    }
  });

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b bg-muted/30">
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          Documentation Assistant
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <Bot className="w-8 h-8 opacity-50" />
              <p>Ask a question about the documentation in this repository.</p>
              <p className="opacity-70">Example: "How do I initialize the database client?"</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role !== "user" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  
                  <div
                    className={`rounded-lg px-4 py-3 max-w-[85%] text-sm ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.role === "user" ? (
                      message.content
                    ) : (
                       <div className="prose prose-sm dark:prose-invert max-w-none">
                         <ReactMarkdown>{message.content}</ReactMarkdown>
                       </div>
                    )}
                  </div>
                  
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="border-t p-3">
        <form
          onSubmit={handleSubmit}
          className="flex w-full items-center space-x-2"
        >
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
