"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";

export default function TokenTestPage() {
    const { data: session }: any = useSession();
    const [tokenInfo, setTokenInfo] = useState<any>(null);
    const [testing, setTesting] = useState(false);

    const testToken = async () => {
        if (!session?.googleAccessToken) {
            alert("Pas de token Google !");
            return;
        }

        setTesting(true);

        try {
            // Appeler Google TokenInfo API
            const res = await fetch(
                `https://oauth2.googleapis.com/tokeninfo?access_token=${session.googleAccessToken}`
            );

            if (res.ok) {
                const data = await res.json();
                setTokenInfo(data);
            } else {
                alert(`Erreur ${res.status}`);
            }
        } catch (e: any) {
            alert(`Erreur: ${e.message}`);
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <Card className="p-6">
                    <h1 className="text-2xl font-bold mb-4">🔍 Test Token Google</h1>

                    <Button onClick={testToken} disabled={testing} className="mb-6">
                        {testing ? "Test en cours..." : "🚀 Tester le token"}
                    </Button>

                    {tokenInfo && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded">
                                <p className="font-semibold">Email:</p>
                                <p>{tokenInfo.email}</p>
                            </div>

                            <div className="bg-green-50 p-4 rounded">
                                <p className="font-semibold mb-2">
                                    Scopes ({tokenInfo.scope?.split(' ').length}) :
                                </p>
                                <ul className="space-y-1 text-sm">
                                    {tokenInfo.scope?.split(' ').map((scope: string, i: number) => (
                                        <li
                                            key={i}
                                            className={scope.includes('documents') ? 'font-bold text-green-700 text-base' : ''}
                                        >
                                            {scope.includes('documents') && '✅ '}
                                            {scope.includes('classroom') && '📚 '}
                                            {scope.includes('forms') && '📝 '}
                                            {scope.includes('drive') && '💾 '}
                                            {scope}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-yellow-50 p-4 rounded">
                                <p className="font-semibold">Scope Documents présent ?</p>
                                <p className="text-2xl mt-2">
                                    {tokenInfo.scope?.includes('documents') ? '✅ OUI' : '❌ NON'}
                                </p>
                            </div>

                            <details className="bg-gray-100 p-4 rounded">
                                <summary className="cursor-pointer font-semibold">
                                    Voir le JSON complet
                                </summary>
                                <pre className="mt-2 text-xs overflow-auto">
                                    {JSON.stringify(tokenInfo, null, 2)}
                                </pre>
                            </details>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
