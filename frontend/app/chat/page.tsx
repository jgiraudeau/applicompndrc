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
    { role: "bot", content: "Bonjour ! Je suis votre **Assistant Pédagogique spécialisé**.\n\nMon expertise couvre la didactique, l'ingénierie de formation et l'analyse approfondie des référentiels (BTS NDRC, MCO, etc.).\n\nQue souhaitez-vous développer ou analyser aujourd'hui ?" }
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

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

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
    <div className="flex flex-col h-screen bg-[#F7F7F8]">
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
      <div className="hidden">
        STATUS: {isLoading ? "Generating..." : "Idle"} | API: {API_BASE_URL}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden p-4 md:p-8">
        <ScrollArea className="h-full pr-4">
          <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-4">
            {(messages || []).map((msg, idx) => (
              <div key={idx} className="flex flex-col w-full gap-6">
                <div
                  className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {msg.role === "user" ? (
                    <div className="w-10 h-10 bg-[#1cb0f6] rounded-full flex items-center justify-center shrink-0 border-2 border-[#1899d6] shadow-sm text-white font-bold mt-2">
                      Vous
                    </div>
                  ) : (
                    <div className="text-6xl md:text-7xl filter drop-shadow-md shrink-0 -mt-2">🧙‍♂️</div>
                  )}

                  <div className={`max-w-[85%] flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`p-5 text-[15px] font-medium leading-relaxed shadow-sm border-2 ${msg.role === "user"
                      ? "bg-[#1cb0f6] text-white border-[#1899d6] rounded-3xl rounded-tr-none"
                      : "bg-white text-slate-700 border-slate-200 rounded-3xl rounded-tl-none"
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
                    </div>
                    {msg.role === "bot" && (
                      <div className="flex gap-2 mt-1 flex-wrap pl-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs bg-white text-slate-600 font-bold border-2 border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                          onClick={() => handleSaveMessage(msg.content)}
                        >
                          <Save className="w-3 h-3 mr-1.5" />
                          Sauvegarder
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs bg-red-50 text-red-600 font-bold border-2 border-red-200 rounded-xl hover:bg-red-100 transition-colors shadow-sm"
                          onClick={() => handleExportDownload(msg.content, 'pdf')}
                        >
                          <FileText className="w-3 h-3 mr-1.5" />
                          PDF
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs bg-orange-50 text-orange-600 font-bold border-2 border-orange-200 rounded-xl hover:bg-orange-100 transition-colors shadow-sm"
                          onClick={() => handleExportDownload(msg.content, 'quiz/gift')}
                        >
                          <FileText className="w-3 h-3 mr-1.5" />
                          Moodle
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs bg-blue-50 text-blue-600 font-bold border-2 border-blue-200 rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
                          onClick={() => handleExportDownload(msg.content, 'docx')}
                        >
                          <FileText className="w-3 h-3 mr-1.5" />
                          Word
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Suggestions if it's the welcome message */}
                {idx === 0 && messages.length === 1 && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 w-full max-w-3xl ml-[3.5rem] lg:ml-[4.5rem]">

                      <button onClick={() => handleSuggestion("Peux-tu me proposer une étude de cas d'entreprise pour travailler la négociation commerciale ?")} className="bg-white border-2 border-slate-200 p-4 rounded-3xl flex flex-col gap-2 text-left hover:border-[#1cb0f6] hover:bg-[#f0f9ff] transition-all active:translate-y-1 shadow-[0_4px_0_0_#e2e8f0] hover:shadow-[0_4px_0_0_#bae6fd] outline-none">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl filter drop-shadow-sm">🏢</span>
                          <span className="font-extrabold text-slate-700 text-sm uppercase tracking-wider">Créer une Étude de Cas</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500">Générez un scénario d'entreprise complet pour préparer vos élèves.</p>
                      </button>

                      <button onClick={() => handleSuggestion("Peux-tu analyser mon cours et en extraire un QCM de 10 questions ?")} className="bg-white border-2 border-slate-200 p-4 rounded-3xl flex flex-col gap-2 text-left hover:border-[#58cc02] hover:bg-[#f2fcf0] transition-all active:translate-y-1 shadow-[0_4px_0_0_#e2e8f0] hover:shadow-[0_4px_0_0_#bbf7d0] outline-none">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl filter drop-shadow-sm">✅</span>
                          <span className="font-extrabold text-slate-700 text-sm uppercase tracking-wider">Quiz & Évaluations</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500">Concevez des quiz précis et pertinents à partir de vos supports.</p>
                      </button>

                      <button onClick={() => handleSuggestion("Quelles sont les compétences clés du bloc 1 du référentiel NDRC à évaluer ?")} className="bg-white border-2 border-slate-200 p-4 rounded-3xl flex flex-col gap-2 text-left hover:border-[#ff9600] hover:bg-[#fff7ed] transition-all active:translate-y-1 shadow-[0_4px_0_0_#e2e8f0] hover:shadow-[0_4px_0_0_#fed7aa] outline-none">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl filter drop-shadow-sm">🎯</span>
                          <span className="font-extrabold text-slate-700 text-sm uppercase tracking-wider">Maîtrise du Référentiel</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500">Décryptez les CCF et les compétences officielles avec précision.</p>
                      </button>

                      <button onClick={() => handleSuggestion("Peux-tu me structurer un plan de séquence sur 4 semaines concernant la fidélisation client ?")} className="bg-white border-2 border-slate-200 p-4 rounded-3xl flex flex-col gap-2 text-left hover:border-[#ce82ff] hover:bg-[#faf5ff] transition-all active:translate-y-1 shadow-[0_4px_0_0_#e2e8f0] hover:shadow-[0_4px_0_0_#e9d5ff] outline-none">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl filter drop-shadow-sm">📅</span>
                          <span className="font-extrabold text-slate-700 text-sm uppercase tracking-wider">Ingénierie Pédagogique</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500">Planifiez et structurez vos séquences de formation annuelles.</p>
                      </button>

                    </div>

                    {/* Banner Tip */}
                    <div className="w-full max-w-3xl ml-[3.5rem] lg:ml-[4.5rem] mt-2 mb-4">
                      <div className="bg-[#fff7ed] border-2 border-[#ff9600] p-5 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-5 shadow-[0_4px_0_0_#ff9600]">
                        <div className="flex items-start md:items-center gap-4">
                          <div className="text-4xl filter drop-shadow-sm shrink-0">💡</div>
                          <div className="flex flex-col gap-1">
                            <h4 className="font-extrabold text-[#d97d00] text-sm md:text-base uppercase tracking-wider">Passer à la vitesse supérieure ?</h4>
                            <p className="text-xs md:text-sm font-bold text-[#b56800] leading-snug">
                              Pour une efficacité redoutable et des contenus mis en forme avec une forte valeur ajoutée (Sujets Complets, CCF, Fiches de Rôle), profitez du **Générateur Spécialisé** !
                            </p>
                          </div>
                        </div>
                        <Link href="/generate" className="w-full md:w-auto shrink-0">
                          <Button className="bg-[#ff9600] w-full hover:bg-[#d97d00] text-white border-b-[4px] border-[#d97d00] active:border-b-0 active:translate-y-1 transition-all rounded-2xl h-12 px-6 font-extrabold uppercase shrink-0">
                            Ouvrir le Générateur
                          </Button>
                        </Link>
                      </div>
                    </div>

                  </>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4">
                <div className="text-6xl md:text-7xl filter drop-shadow-md shrink-0 -mt-2">🧙‍♂️</div>
                <div className="bg-white p-4 rounded-3xl rounded-tl-none border-2 border-slate-200 shadow-sm flex items-center gap-2 mt-4 lg:mt-6">
                  <div className="w-2.5 h-2.5 bg-[#1cb0f6] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2.5 h-2.5 bg-[#58cc02] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2.5 h-2.5 bg-[#ff9600] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
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
      <div className="bg-[#F7F7F8] border-t-2 border-slate-200 p-4">
        <div className="max-w-4xl mx-auto flex gap-3 items-end">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.md,.txt,.docx"
          />
          <Button
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className={`h-14 w-14 rounded-2xl border-b-[4px] active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center shrink-0 ${selectedFile
              ? "bg-amber-100 border-amber-300 text-amber-600 hover:bg-amber-200 shadow-sm"
              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm"
              }`}
          >
            {/* Lucide icon here */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
          </Button>

          <div className="flex-1 flex flex-col gap-2 relative">
            {selectedFile && (
              <div className="absolute -top-10 left-0 bg-amber-50 border-2 border-amber-200 text-amber-700 px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm">
                <span>📄 {selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} className="hover:text-amber-900 bg-amber-200 rounded-full w-5 h-5 flex items-center justify-center">×</button>
              </div>
            )}
            <input
              placeholder="Écrivez votre message à Merlin..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && handleSend()}
              disabled={isLoading}
              className="w-full h-14 bg-white border-2 border-slate-200 focus:border-[#1cb0f6] focus:bg-[#f0f9ff] rounded-2xl px-5 font-bold text-slate-700 outline-none transition-colors shadow-sm placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !selectedFile)}
            className={`h-14 px-6 rounded-2xl font-black uppercase tracking-widest transition-all active:translate-y-2 touch-manipulation flex items-center justify-center shrink-0 ${(input.trim() || selectedFile)
              ? 'bg-[#1cb0f6] hover:bg-[#1899d6] text-white border-b-[6px] border-[#1899d6] active:border-b-0 shadow-sm'
              : 'bg-slate-200 text-slate-400 border-b-[6px] border-slate-300 active:border-b-0 shadow-sm'
              }`}
          >
            <Send className="w-5 h-5 mr-0 md:mr-2" />
            <span className="hidden md:inline">Envoyer</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
