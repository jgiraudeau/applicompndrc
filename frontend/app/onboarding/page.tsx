"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Loader2, Sparkles, Store } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function OnboardingPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const [step, setStep] = useState<"selection" | "confirmation">("selection");

    useEffect(() => {
        if (status === "loading") return;
        if (status === "unauthenticated") {
            router.push("/");
            return;
        }

        // If user is already active/approved, redirect to dashboard
        if ((session?.user as any)?.status === "active") {
            router.push("/dashboard");
        }

        // If user has already selected a plan but is pending, maybe show confirmation directly?
        // For simplicity, let them re-select if they want, or we can check plan in session
    }, [status, session, router]);

    const handleSelectPlan = async (plan: string) => {
        setSelectedPlan(plan);
    };

    const handleSubmit = async () => {
        if (!selectedPlan) return;
        setIsLoading(true);

        const token = (session as any)?.accessToken || (session as any)?.user?.accessToken;

        try {
            const res = await fetch(`${API_BASE_URL}/api/users/me/plan`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ plan: selectedPlan })
            });

            if (res.ok) {
                setStep("confirmation");
            } else {
                alert("Une erreur est survenue. Veuillez réessayer.");
            }
        } catch (error) {
            console.error(error);
            alert("Erreur de connexion.");
        } finally {
            setIsLoading(false);
        }
    };

    if (status === "loading") {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Chargement...</div>;
    }

    if (step === "confirmation") {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-lg border-slate-200">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Demande envoyée !</h1>
                        <p className="text-slate-500">
                            Merci de votre inscription. Un administrateur va examiner votre demande et valider votre compte sous peu.
                        </p>
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
                            Vous recevrez un email de confirmation dès l'activation de votre accès.
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">Bienvenue sur Professeur Virtuel</h1>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Pour finaliser votre inscription, veuillez choisir la formule qui vous convient.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Trial Plan */}
                    <div
                        className={`relative p-8 rounded-2xl border-2 transition-all cursor-pointer bg-white ${selectedPlan === 'trial'
                                ? 'border-blue-500 shadow-xl scale-105 z-10'
                                : 'border-slate-200 hover:border-blue-200 hover:shadow-lg'
                            }`}
                        onClick={() => handleSelectPlan('trial')}
                    >
                        <div className="space-y-4">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                                <Store className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Essai Gratuit</h3>
                                <p className="text-slate-500">Pour découvrir la plateforme</p>
                            </div>
                            <div className="text-3xl font-bold text-slate-900">
                                0€ <span className="text-base font-normal text-slate-500">/ 14 jours</span>
                            </div>
                            <ul className="space-y-3 pt-4">
                                <li className="flex items-center text-slate-600">
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                                    Accès au générateur de cours
                                </li>
                                <li className="flex items-center text-slate-600">
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                                    Export PDF basique
                                </li>
                                <li className="flex items-center text-slate-600">
                                    <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                                    Support par email
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Pro Plan */}
                    <div
                        className={`relative p-8 rounded-2xl border-2 transition-all cursor-pointer bg-white ${selectedPlan === 'subscription'
                                ? 'border-purple-500 shadow-xl scale-105 z-10 ring-4 ring-purple-50'
                                : 'border-slate-200 hover:border-purple-200 hover:shadow-lg'
                            }`}
                        onClick={() => handleSelectPlan('subscription')}
                    >
                        <div className="absolute top-0 right-0 bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                            POPULAIRE
                        </div>
                        <div className="space-y-4">
                            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Abonnement Pro</h3>
                                <p className="text-slate-500">Pour les enseignants engagés</p>
                            </div>
                            <div className="text-3xl font-bold text-slate-900">
                                9,99€ <span className="text-base font-normal text-slate-500">/ mois</span>
                            </div>
                            <ul className="space-y-3 pt-4">
                                <li className="flex items-center text-slate-600">
                                    <CheckCircle className="w-5 h-5 text-purple-500 mr-3" />
                                    Accès illimité à tous les outils
                                </li>
                                <li className="flex items-center text-slate-600">
                                    <CheckCircle className="w-5 h-5 text-purple-500 mr-3" />
                                    Exports Word & PDF Pro
                                </li>
                                <li className="flex items-center text-slate-600">
                                    <CheckCircle className="w-5 h-5 text-purple-500 mr-3" />
                                    Intégration Google Classroom
                                </li>
                                <li className="flex items-center text-slate-600">
                                    <CheckCircle className="w-5 h-5 text-purple-500 mr-3" />
                                    Support prioritaire
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="max-w-md mx-auto mt-12">
                    <Button
                        size="lg"
                        className="w-full h-14 text-lg font-bold bg-slate-900 hover:bg-slate-800"
                        disabled={!selectedPlan || isLoading}
                        onClick={handleSubmit}
                    >
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                        {selectedPlan ? "Confirmer mon choix" : "Sélectionnez une offre"}
                    </Button>
                    <p className="text-center text-xs text-slate-400 mt-4">
                        Aucun paiement requis pour l'instant. Votre demande sera soumise à validation.
                    </p>
                </div>
            </div>
        </div>
    );
}
