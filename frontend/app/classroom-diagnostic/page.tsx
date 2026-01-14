"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { API_BASE_URL } from "@/lib/api";

export default function ClassroomDiagnosticPage() {
    const { data: session }: any = useSession();
    const [testResults, setTestResults] = useState<any>(null);
    const [testing, setTesting] = useState(false);

    const runDiagnostic = async () => {
        setTesting(true);
        const results: any = {
            timestamp: new Date().toLocaleString(),
            checks: []
        };

        // Check 1: Session exists
        results.checks.push({
            name: "Session NextAuth",
            status: !!session ? "✅ OK" : "❌ FAIL",
            details: session ? "Session trouvée" : "Pas de session"
        });

        // Check 2: Google Access Token exists
        const hasGoogleToken = !!session?.googleAccessToken;
        results.checks.push({
            name: "Google Access Token",
            status: hasGoogleToken ? "✅ OK" : "❌ FAIL",
            details: hasGoogleToken
                ? `Token présent (${session.googleAccessToken.substring(0, 20)}...)`
                : "Token manquant dans la session"
        });

        // Check 3: Test Token Info
        if (hasGoogleToken) {
            try {
                const tokenInfoRes = await fetch(
                    `https://oauth2.googleapis.com/tokeninfo?access_token=${session.googleAccessToken}`
                );
                if (tokenInfoRes.ok) {
                    const tokenInfo = await tokenInfoRes.json();
                    const scopes = tokenInfo.scope?.split(" ") || [];
                    const hasClassroomScopes = scopes.some((s: string) => s.includes("classroom"));

                    results.checks.push({
                        name: "Token Info Google",
                        status: "✅ OK",
                        details: `Email: ${tokenInfo.email}, Scopes: ${scopes.length}`
                    });

                    results.checks.push({
                        name: "Scopes Classroom",
                        status: hasClassroomScopes ? "✅ OK" : "⚠️ WARNING",
                        details: hasClassroomScopes
                            ? "Scopes Classroom présents"
                            : "Scopes Classroom manquants",
                        scopes: scopes
                    });
                } else {
                    results.checks.push({
                        name: "Token Info Google",
                        status: "❌ FAIL",
                        details: `Erreur ${tokenInfoRes.status}: Token invalide ou expiré`
                    });
                }
            } catch (e: any) {
                results.checks.push({
                    name: "Token Info Google",
                    status: "❌ ERROR",
                    details: e.message
                });
            }
        }

        // Check 4: Test backend classroom endpoint
        if (hasGoogleToken) {
            try {
                const coursesRes = await fetch(`${API_BASE_URL}/api/classroom/courses`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token: session.googleAccessToken })
                });

                if (coursesRes.ok) {
                    const courses = await coursesRes.json();
                    results.checks.push({
                        name: "Backend /api/classroom/courses",
                        status: "✅ OK",
                        details: `Trouvé ${courses.length} cours`,
                        courses: courses.slice(0, 3)
                    });
                } else {
                    const error = await coursesRes.text();
                    results.checks.push({
                        name: "Backend /api/classroom/courses",
                        status: "❌ FAIL",
                        details: `Erreur ${coursesRes.status}: ${error}`
                    });
                }
            } catch (e: any) {
                results.checks.push({
                    name: "Backend /api/classroom/courses",
                    status: "❌ ERROR",
                    details: e.message
                });
            }
        }

        setTestResults(results);
        setTesting(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
                <Card className="p-6">
                    <h1 className="text-2xl font-bold mb-4">🔍 Diagnostic Google Classroom</h1>
                    <p className="text-gray-600 mb-6">
                        Cette page teste si l'intégration Google Classroom fonctionne correctement.
                    </p>

                    <Button
                        onClick={runDiagnostic}
                        disabled={testing}
                        className="mb-6"
                    >
                        {testing ? "Test en cours..." : "🚀 Lancer le diagnostic"}
                    </Button>

                    {testResults && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded border border-blue-200">
                                <p className="text-sm text-blue-800">
                                    <strong>Test effectué à :</strong> {testResults.timestamp}
                                </p>
                            </div>

                            {testResults.checks.map((check: any, index: number) => (
                                <div
                                    key={index}
                                    className={`p-4 rounded border ${check.status.includes("✅") ? "bg-green-50 border-green-200" :
                                            check.status.includes("⚠️") ? "bg-yellow-50 border-yellow-200" :
                                                "bg-red-50 border-red-200"
                                        }`}
                                >
                                    <h3 className="font-semibold mb-2">
                                        {check.status} {check.name}
                                    </h3>
                                    <p className="text-sm mb-2">{check.details}</p>

                                    {check.scopes && (
                                        <details className="mt-2">
                                            <summary className="cursor-pointer text-xs font-medium">
                                                Voir les scopes ({check.scopes.length})
                                            </summary>
                                            <ul className="mt-2 text-xs space-y-1 pl-4">
                                                {check.scopes.map((scope: string, i: number) => (
                                                    <li key={i} className={scope.includes("classroom") ? "font-bold text-green-700" : ""}>
                                                        {scope}
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}

                                    {check.courses && (
                                        <details className="mt-2">
                                            <summary className="cursor-pointer text-xs font-medium">
                                                Voir les cours ({check.courses.length})
                                            </summary>
                                            <ul className="mt-2 text-xs space-y-1 pl-4">
                                                {check.courses.map((course: any, i: number) => (
                                                    <li key={i}>
                                                        <strong>{course.name}</strong> - {course.id}
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}
                                </div>
                            ))}

                            <div className="mt-6 p-4 bg-gray-100 rounded">
                                <h3 className="font-semibold mb-2">📊 Résumé</h3>
                                <p className="text-sm">
                                    <strong>Checks réussis :</strong>{" "}
                                    {testResults.checks.filter((c: any) => c.status.includes("✅")).length} / {testResults.checks.length}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t">
                        <h3 className="font-semibold mb-2">ℹ️ Informations</h3>
                        <ul className="text-sm space-y-1 text-gray-600">
                            <li>• Si le token Google est manquant, déconnectez-vous et reconnectez-vous</li>
                            <li>• Les scopes Classroom doivent être présents pour que l'export fonctionne</li>
                            <li>• Le backend doit pouvoir accéder à l'API Google Classroom</li>
                        </ul>
                    </div>
                </Card>
            </div>
        </div>
    );
}
