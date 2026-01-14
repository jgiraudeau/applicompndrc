"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/api";

export default function ClassroomTestPage() {
    const { data: session }: any = useSession();
    const [result, setResult] = useState<any>(null);
    const [testing, setTesting] = useState(false);

    const testBackend = async () => {
        if (!session?.googleAccessToken) {
            alert("Pas de token Google !");
            return;
        }

        setTesting(true);
        setResult(null);

        try {
            // Test avec l'endpoint backend
            const res = await fetch(`${API_BASE_URL}/api/classroom/coursework`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    token: session.googleAccessToken,
                    courseId: "TEST_ID",  // ID bidon pour tester
                    title: "Test Document",
                    description: "Description de test",
                    document_url: "https://docs.google.com/document/d/1dSS6nQmAfNngsMrSmxa9Py6VmbP2Dp-pkaH3gd1rF0M/edit"
                })
            });

            const text = await res.text();

            setResult({
                status: res.status,
                ok: res.ok,
                response: text
            });

        } catch (e: any) {
            setResult({
                error: true,
                message: e.message
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <Card className="p-6">
                    <h1 className="text-2xl font-bold mb-4">🔍 Test Backend Classroom</h1>

                    <Button onClick={testBackend} disabled={testing} className="mb-6">
                        {testing ? "Test en cours..." : "🚀 Tester l'endpoint backend"}
                    </Button>

                    {result && (
                        <div className="space-y-4">
                            <div className={`p-4 rounded ${result.ok ? 'bg-green-50' : 'bg-red-50'}`}>
                                <p className="font-semibold">Status: {result.status}</p>
                                <p className="text-sm mt-2 whitespace-pre-wrap font-mono">
                                    {result.response}
                                </p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
