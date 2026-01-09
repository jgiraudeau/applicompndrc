"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    GraduationCap,
    MessageSquare,
    ArrowRight,
    CheckCircle2,
    BookOpen,
    HelpCircle,
    Bot,
    Send,
    X
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface QuizData {
    title: string;
    content: string;
}

export default function StudentPage() {
    const [code, setCode] = useState("");
    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    // Tutor State
    const [showTutor, setShowTutor] = useState(false);
    const [tutorInput, setTutorInput] = useState("");
    const [tutorMessages, setTutorMessages] = useState<{ role: 'bot' | 'user', content: string }[]>([]);
    const [isThinking, setIsThinking] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleJoinQuiz = async () => {
        if (!code.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/student/quiz/${code.toUpperCase()}`);
            if (!res.ok) throw new Error("Code invalide ou quiz expiré");
            const data = await res.json();
            setQuiz(data);
            setTutorMessages([
                { role: 'bot', content: "Bonjour ! Je suis ton tuteur IA. Je peux t'aider à comprendre les questions de ce quiz si tu bloques. N'hésite pas à me poser tes questions !" }
            ]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTutorSend = async () => {
        if (!tutorInput.trim() || isThinking) return;

        const userMsg = { role: 'user' as const, content: tutorInput };
        setTutorMessages(prev => [...prev, userMsg]);
        setTutorInput("");
        setIsThinking(true);

        try {
            const response = await fetch("http://127.0.0.1:8000/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: `L'élève travaille sur le document suivant : "${quiz?.title}". Voici le contenu : ${quiz?.content}. L'élève pose la question : ${userMsg.content}. Réponds de manière pédagogique et encourageante.`,
                    history: tutorMessages
                }),
            });
            const data = await response.json();
            setTutorMessages(prev => [...prev, { role: 'bot', content: data.response }]);
        } catch (err) {
            setTutorMessages(prev => [...prev, { role: 'bot', content: "Désolé, j'ai une petite panne technique. Réessaie dans un instant !" }]);
        } finally {
            setIsThinking(false);
        }
    };

    if (!mounted) return null;

    if (!quiz) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
                <Card className="max-w-md w-full p-8 shadow-xl border-none">
                    <div className="flex flex-col items-center text-center gap-6">
                        <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-200">
                            <GraduationCap className="w-10 h-10 text-white" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-slate-900">Espace Étudiant</h1>
                            <p className="text-slate-500">Prêt pour ton évaluation ? Entre le code fourni par ton professeur.</p>
                        </div>

                        <div className="w-full space-y-4">
                            <div className="flex flex-col gap-2">
                                <Input
                                    placeholder="CODE (Ex: 4F2G7H...)"
                                    className="text-center text-2xl font-bold tracking-widest uppercase h-14 border-2 focus-visible:ring-indigo-500"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleJoinQuiz()}
                                />
                                {error && <p className="text-red-500 text-sm font-medium">❌ {error}</p>}
                            </div>
                            <Button
                                className="w-full h-12 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-md"
                                onClick={handleJoinQuiz}
                                disabled={isLoading || !code}
                            >
                                {isLoading ? "Chargement..." : (
                                    <>
                                        Rejoindre <ArrowRight className="w-5 h-5 ml-2" />
                                    </>
                                )}
                            </Button>
                        </div>

                        <div className="pt-4 border-t w-full">
                            <p className="text-xs text-slate-400">BTS NDRC • Plateforme d'Apprentissage Virtuelle</p>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-white">
            {/* Minimal Header */}
            <header className="bg-white border-b p-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 p-2 rounded-lg">
                        <GraduationCap className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="font-bold text-slate-800">{quiz.title}</h2>
                        <p className="text-xs text-slate-500">Evaluation Interactive</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setQuiz(null)} className="text-slate-500">
                    <X className="w-4 h-4 mr-2" /> Quitter
                </Button>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full p-6 md:p-10 pb-32">
                <div className="prose prose-indigo max-w-none">
                    <ReactMarkdown>{quiz.content}</ReactMarkdown>
                </div>

                <div className="mt-12 p-8 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center text-center gap-4">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                    <div className="space-y-1">
                        <h3 className="text-lg font-bold text-slate-800">C'est terminé ?</h3>
                        <p className="text-slate-500 text-sm">Vérifie bien tes réponses avant de clôturer la séance.</p>
                    </div>
                    <Button onClick={() => setQuiz(null)} className="bg-indigo-600">Finir l'exercice</Button>
                </div>
            </main>

            {/* AI Tutor Toggle Button */}
            <button
                onClick={() => setShowTutor(!showTutor)}
                className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl transition-all duration-300 z-50 flex items-center gap-2 ${showTutor ? "bg-slate-800 scale-90" : "bg-indigo-600 hover:scale-110 active:scale-95 text-white"
                    }`}
            >
                {showTutor ? <X className="w-6 h-6 text-white" /> : (
                    <>
                        <Bot className="w-6 h-6" />
                        <span className="font-semibold pr-2">Aide IA</span>
                    </>
                )}
            </button>

            {/* Tutor Modal/Sidebar */}
            {showTutor && (
                <div className="fixed bottom-24 right-6 w-[350px] max-h-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-40 overflow-hidden animate-in slide-in-from-bottom-5">
                    <div className="bg-indigo-600 p-4 text-white flex items-center gap-2">
                        <Bot className="w-5 h-5" />
                        <div>
                            <p className="font-bold text-sm">Tuteur IA</p>
                            <p className="text-[10px] opacity-80">En ligne pour t'aider</p>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 p-4 bg-slate-50">
                        <div className="flex flex-col gap-4">
                            {tutorMessages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-3 rounded-2xl text-sm max-w-[85%] ${msg.role === 'user'
                                            ? "bg-indigo-600 text-white rounded-tr-none shadow-md"
                                            : "bg-white text-slate-700 border border-slate-200 rounded-tl-none shadow-sm"
                                        }`}>
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                </div>
                            ))}
                            {isThinking && (
                                <div className="flex justify-start">
                                    <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="p-3 border-t bg-white flex gap-2">
                        <Input
                            value={tutorInput}
                            onChange={(e) => setTutorInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleTutorSend()}
                            placeholder="Pose ta question ici..."
                            className="bg-slate-50 border-none h-10"
                        />
                        <Button onClick={handleTutorSend} size="icon" className="h-10 w-10 shrink-0">
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
