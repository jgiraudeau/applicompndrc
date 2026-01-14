"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";

export default function GoogleDocsTestPage() {
    const { data: session }: any = useSession();
    const [result, setResult] = useState<any>(null);
    const [testing, setTesting] = useState(false);

    const testCreateDoc = async () => {
        if (!session?.googleAccessToken) {
            alert("Pas de token Google !");
            return;
        }

        setTesting(true);
        setResult(null);

        try {
            // Test 1: Créer un document vide
            const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${session.googleAccessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    title: "Test Document - " + new Date().toLocaleString()
                })
            });

            if (!createRes.ok) {
                const error = await createRes.text();
                setResult({
                    success: false,
                    status: createRes.status,
                    error: error,
                    message: "Erreur lors de la création du document"
                });
                return;
            }

            const docData = await createRes.json();
            const documentId = docData.documentId;

            setResult({
                success: true,
                documentId: documentId,
                documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
                message: "✅ Document créé avec succès !",
                data: docData
            });

        } catch (e: any) {
            setResult({
                success: false,
                error: e.message,
                message: "❌ Erreur technique"
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <Card className="p-6">
                    <h1 className="text-2xl font-bold mb-4">🔍 Test Google Docs API</h1>

                    <Button onClick={testCreateDoc} disabled={testing} className="mb-6">
                        {testing ? "Test en cours..." : "🚀 Créer un document de test"}
                    </Button>

                    {result && (
                        <div className="space-y-4">
                            <div className={`p-4 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                                <p className="font-semibold text-lg mb-2">
                                    {result.message}
                                </p>

                                {result.success && (
                                    <>
                                        <p className="mb-2"><strong>Document ID:</strong> {result.documentId}</p>
                                        <a
                                            href={result.documentUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline"
                                        >
                                            🔗 Ouvrir le document
                                        </a>
                                    </>
                                )}

                                {!result.success && (
                                    <>
                                        <p className="mb-2"><strong>Status:</strong> {result.status}</p>
                                        <p className="text-sm text-red-700 mt-2">
                                            <strong>Erreur:</strong> {result.error}
                                        </p>
                                    </>
                                )}
                            </div>

                            {result.data && (
                                <details className="bg-gray-100 p-4 rounded">
                                    <summary className="cursor-pointer font-semibold">
                                        Voir la réponse complète
                                    </summary>
                                    <pre className="mt-2 text-xs overflow-auto">
                                        {JSON.stringify(result.data, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    )}

                    <div className="mt-8 p-4 bg-blue-50 rounded">
                        <h3 className="font-semibold mb-2">ℹ️ Ce test vérifie :</h3>
                        <ul className="text-sm space-y-1">
                            <li>✅ Si le token a bien le scope documents</li>
                            <li>✅ Si l'API Google Docs accepte votre token</li>
                            <li>✅ Si un document peut être créé</li>
                        </ul>
                    </div>
                </Card>
            </div>
        </div>
    );
}
