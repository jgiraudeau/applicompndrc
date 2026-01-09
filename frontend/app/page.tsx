"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, User, Bot, GraduationCap, Sparkles, LayoutDashboard } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

interface Message {
  role: "user" | "bot";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", content: "Bonjour ! Je suis votre Professeur Virtuel. Je connais tout le contenu du BTS NDRC. Comment puis-je vous aider aujourd'hui ?" }
  ]);
  const [input, setInput] = useState("");
  // Persistent state for the active file context
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !selectedFile) return;

    // Build message content
    let msgContent = input;
    // The file name is now displayed in the header, so no need to prepend to message
    // if (selectedFile) {
    //   msgContent = `[Fichier joint: ${selectedFile.name}] ${input}`;
    // }

    const userMsg: Message = { role: "user", content: msgContent };

    // Optimistic update
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);

    setInput("");
    const fileToUpload = selectedFile;
    setSelectedFile(null);
    setIsLoading(true);

    try {
      let activeId = currentFileId; // Start with existing ID

      // 1. Upload new file if exists (replaces previous context)
      if (fileToUpload) {
        const formData = new FormData();
        formData.append("file", fileToUpload);

        const uploadRes = await fetch("http://127.0.0.1:8000/api/documents/upload", {
          method: "POST",
          body: formData
        });

        if (!uploadRes.ok) throw new Error("Échec de l'upload");
        const uploadData = await uploadRes.json();
        activeId = uploadData.gemini_file_name;
        setCurrentFileId(activeId);
        setCurrentFileName(fileToUpload.name);
      }

      // 2. Send Message with HISTORY and PERSISTENT FILE ID
      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          file_id: activeId, // Use the persistent ID
          history: (messages || []).map(m => ({ role: m.role, content: m.content })) // Send past history
        }),
      });

      if (!response.ok) throw new Error("Erreur réseau");

      const data = await response.json();
      const botMsg: Message = { role: "bot", content: data.response };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: Message = { role: "bot", content: "❌ Désolé, je rencontre un problème technique." };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b p-4 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <div className="bg-primary/10 p-2 rounded-lg">
          <GraduationCap className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="font-bold text-xl text-slate-800">Professeur Virtuel</h1>
          <p className="text-xs text-slate-500">BTS NDRC • Assistant Pédagogique IA</p>
        </div>
        {currentFileName && (
          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs border border-blue-100">
            <span>📎 Contexte : {currentFileName}</span>
            <button onClick={() => { setCurrentFileId(null); setCurrentFileName(null); }} className="hover:text-red-500 font-bold ml-1">×</button>
          </div>
        )}
        <Link href="/dashboard" className="ml-auto">
          <Button variant="ghost" className="gap-2 text-slate-600 hover:text-slate-900 border-transparent">
            <LayoutDashboard className="w-4 h-4" />
            Tableau de bord
          </Button>
        </Link>
        <Link href="/generate">
          <Button variant="outline" className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50">
            <Sparkles className="w-4 h-4" />
            Générer un cours
          </Button>
        </Link>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden p-4">
        <ScrollArea className="h-full pr-4">
          <div className="flex flex-col gap-4 max-w-3xl mx-auto pb-4">
            {(messages || []).map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarFallback className={msg.role === "user" ? "bg-slate-200" : "bg-primary text-white"}>
                    {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </AvatarFallback>
                </Avatar>

                <Card className={`p-4 max-w-[80%] text-sm leading-relaxed shadow-sm ${msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-none"
                  : "bg-white text-slate-700 rounded-tl-none border-slate-200"
                  }`}>
                  {msg.role === "bot" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1">
                      <ReactMarkdown>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </Card>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-white"><Bot size={16} /></AvatarFallback>
                </Avatar>
                <div className="bg-white p-3 rounded-lg rounded-tl-none border border-slate-200 shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t p-4">
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.md,.txt,.docx"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className={selectedFile ? "bg-blue-50 border-blue-200 text-blue-600" : "text-slate-500"}
          >
            {/* Lucide icon here */}
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
          </Button>

          <div className="flex-1 flex flex-col gap-2">
            {selectedFile && (
              <div className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-md flex justify-between items-center">
                <span>📄 {selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} className="hover:text-blue-900">×</button>
              </div>
            )}
            <Input
              placeholder="Posez une question sur le cours..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
              disabled={isLoading}
              className="w-full"
            />
          </div>
          <Button onClick={handleSend} disabled={isLoading || (!input.trim() && !selectedFile)}>
            <Send className="w-4 h-4 mr-2" />
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}
