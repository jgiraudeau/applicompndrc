"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, User, Bot, GraduationCap, Sparkles, LayoutDashboard, Share, Loader2, LogOut, FileText, Save } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/api";
import { useSession, signOut } from "next-auth/react";
import { Navbar } from "@/components/Navbar";

interface Message {
  role: "user" | "bot";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", content: "Bonjour ! Je suis Votre Assistant Professeur. Je connais tout le contenu du BTS NDRC. Comment puis-je vous aider aujourd'hui ?" }
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

  const { data: session }: any = useSession();

  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      console.log("🔒 CHECKING ACCESS (Chat):", {
        email: user.email,
        plan: user.plan_selection,
        stripeId: user.stripeCustomerId
      });

      // GATEKEEPER: Redirect to payment if Pro checked but not paid
      if (user.plan_selection === 'subscription' && !user.stripeCustomerId) {
        console.log("🔒 Paiement requis. Redirection vers Onboarding.");
        window.location.href = "/onboarding";
        return;
      }
    }
  }, [session]);
  const [courses, setCourses] = useState<any[]>([]);
  const [isClassroomModalOpen, setIsClassroomModalOpen] = useState(false);
  const [contentToExport, setContentToExport] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [exportLoading, setExportLoading] = useState(false);

  const fetchCourses = async () => {
    if (!session?.googleAccessToken) {
      alert("Veuillez vous reconnecter avec Google pour utiliser cette fonctionnalité.");
      return;
    }
    try {
      setExportLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/classroom/courses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: session.googleAccessToken })
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
        if (data.length > 0) setSelectedCourseId(data[0].id);
        setIsClassroomModalOpen(true);
      } else {
        alert("Impossible de récupérer vos cours Google Classroom.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur technique lors de la communication avec Google.");
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportToClassroom = async () => {
    if (!selectedCourseId) return;
    setExportLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/classroom/coursework`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: session.googleAccessToken,
          courseId: selectedCourseId,
          title: "Exercice généré par Votre Assistant Professeur",
          description: contentToExport
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Devoir créé avec succès ! Lien : ${data.url}`);
        setIsClassroomModalOpen(false);
      } else {
        alert("Erreur lors de la création du devoir.");
      }
    } catch (e) {
      alert("Erreur technique.");
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportDownload = async (content: string, format: string) => {
    try {
      const token = (session as any)?.accessToken;
      // Adjust endpoint logic: use /api/export/quiz/... for quiz types if needed, 
      // but here we might rely on the generic /api/export/{format} if valid, 
      // OR better, mirroring logic from generate page:
      let endpoint = `${API_BASE_URL}/api/export/${format}`;
      if (format.includes('quiz/') || format === 'gift') {
        // If the format passed is 'quiz/gift', endpoint becomes .../api/export/quiz/gift
        // If just 'gift', we might need to adjust. Assuming format passed is full path suffix.
        // Actually, let's keep it simple as implemented: endpoint is .../api/export/{format}
        // The format passed from button is 'quiz/gift', so endpoint: .../api/export/quiz/gift. Correct.
      }

      const res = await fetch(`${API_BASE_URL}/api/export/${format}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          content: content,
          filename: `export_profvirtuel_${Date.now()}`
        })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        // Determiner l'extension selon le format
        let ext = format === 'pdf' ? 'pdf' : 'docx';
        if (format.includes('gift')) ext = 'txt';
        if (format.includes('wooclap')) ext = 'xlsx';
        if (format.includes('google')) ext = 'csv';

        a.download = `profvirtuel_${format.replace('/', '_')}_${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert("Erreur lors de l'export");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur technique");
    }
  };

  // ...

  const handleSaveMessage = async (content: string) => {
    try {
      const token = (session as any)?.accessToken;
      if (!token) {
        alert("Vous devez être connecté.");
        return;
      }
      const title = "Chat: " + (content.split('\n')[0] || "").substring(0, 40) + "...";
      const res = await fetch(`${API_BASE_URL}/api/documents/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title,
          content: content,
          document_type: "chat_export"
        })
      });
      if (res.ok) alert("Message sauvegardé !");
      else alert("Erreur lors de la sauvegarde.");
    } catch (e) {
      console.error(e);
      alert("Erreur technique.");
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

        const uploadRes = await fetch(`${API_BASE_URL}/api/documents/upload`, {
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
      const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMsg.content,
          file_id: activeId, // Use the persistent ID
          history: (messages || []).map(m => ({ role: m.role, content: m.content })) // Send past history
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      const botMsg: Message = { role: "bot", content: data.response };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error: any) {
      console.error(error);
      const errorMsg: Message = { role: "bot", content: `❌ Désolé, je rencontre un problème technique : ${error.message}` };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Navbar />

      {/* Context Sub-Header */}
      {currentFileName && (
        <div className="bg-blue-50 border-b border-blue-100 p-2 flex items-center justify-center gap-2 text-sm text-blue-700 animate-in slide-in-from-top-2">
          <span>📄 Contexte actif : <span className="font-semibold">{currentFileName}</span></span>
          <button
            onClick={() => { setCurrentFileId(null); setCurrentFileName(null); }}
            className="hover:bg-blue-100 p-1 rounded-full transition-colors"
            title="Supprimer le contexte"
          >
            ✕
          </button>
        </div>
      )}

      {/* Debug Bar - Simplified */}
      <div className="bg-slate-100 text-[10px] text-slate-400 p-1 text-center">
        STATUS: {isLoading ? "Generating..." : "Idle"} | API: {API_BASE_URL}
      </div>

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

                <div className={`max-w-[80%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <Card className={`p-4 text-sm leading-relaxed shadow-sm ${msg.role === "user"
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
                  {msg.role === "bot" && (
                    <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        onClick={() => handleSaveMessage(msg.content)}
                      >
                        <Save className="w-3 h-3 mr-1.5" />
                        Sauvegarder
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800 transition-colors"
                        onClick={() => handleExportDownload(msg.content, 'pdf')}
                      >
                        <FileText className="w-3 h-3 mr-1.5" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:text-orange-800 transition-colors"
                        onClick={() => handleExportDownload(msg.content, 'quiz/gift')}
                      >
                        <FileText className="w-3 h-3 mr-1.5" />
                        Moodle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                        onClick={() => handleExportDownload(msg.content, 'docx')}
                      >
                        <FileText className="w-3 h-3 mr-1.5" />
                        Word
                      </Button>
                    </div>
                  )}
                </div>
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

          {/* Modal Google Classroom */}
          {isClassroomModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-md bg-white">
                <div className="p-6">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="text-green-600">Google Classroom</span>
                    Exporter le contenu
                  </h2>
                  <p className="text-sm text-gray-500 mb-4">
                    Sélectionnez le cours dans lequel créer un devoir brouillon.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold uppercase text-gray-400 block mb-1">Cours</label>
                      <select
                        className="w-full border rounded p-2 text-sm"
                        value={selectedCourseId}
                        onChange={(e) => setSelectedCourseId(e.target.value)}
                      >
                        {courses.map(c => (
                          <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" onClick={() => setIsClassroomModalOpen(false)}>Annuler</Button>
                      <Button onClick={handleExportToClassroom} disabled={exportLoading}>
                        {exportLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Créer le devoir"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
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
