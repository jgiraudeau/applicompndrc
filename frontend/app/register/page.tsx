"use client"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        full_name: "",
        organization_name: "",
        email: "",
        password: "",
        plan: "free"
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.detail || "Erreur lors de l'inscription")
            }

            // Success
            router.push("/login")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value })
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Inscription Établissement</CardTitle>
                    <CardDescription className="text-center">
                        Créez votre compte Assistant Professeur
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="grid w-full items-center gap-4">
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="organization_name">Nom de l'établissement</Label>
                                <Input id="organization_name" placeholder="Lycée Victor Hugo" value={formData.organization_name} onChange={handleChange} required />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="full_name">Nom complet (Admin)</Label>
                                <Input id="full_name" placeholder="Jean Dupont" value={formData.full_name} onChange={handleChange} required />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="email">Email professionnel</Label>
                                <Input id="email" type="email" placeholder="directeur@lycee.fr" value={formData.email} onChange={handleChange} required />
                            </div>
                            <div className="flex flex-col space-y-1.5">
                                <Label htmlFor="password">Mot de passe</Label>
                                <Input id="password" type="password" value={formData.password} onChange={handleChange} required />
                            </div>

                            <div className="flex flex-col space-y-3 pt-2">
                                <Label>Choix de l'abonnement</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div
                                        className={`border rounded-lg p-3 text-center cursor-pointer ${formData.plan === 'free' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                                        onClick={() => setFormData({ ...formData, plan: 'free' })}
                                    >
                                        <div className="font-bold">Gratuit</div>
                                        <div className="text-xs text-gray-500">Découverte</div>
                                    </div>
                                    <div
                                        className={`border rounded-lg p-3 text-center cursor-pointer ${formData.plan === 'pro' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                                        onClick={() => setFormData({ ...formData, plan: 'pro' })}
                                    >
                                        <div className="font-bold">Pro</div>
                                        <div className="text-xs text-gray-500">9.99€/mois</div>
                                    </div>
                                    <div
                                        className={`border rounded-lg p-3 text-center cursor-pointer ${formData.plan === 'enterprise' ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                                        onClick={() => setFormData({ ...formData, plan: 'enterprise' })}
                                    >
                                        <div className="font-bold">École</div>
                                        <div className="text-xs text-gray-500">Sur devis</div>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="text-sm text-red-500 font-medium text-center">
                                    {error}
                                </div>
                            )}
                        </div>
                        <Button className="w-full mt-6" type="submit" disabled={loading}>
                            {loading ? "Création en cours..." : "Créer mon établissement"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-gray-500">
                        Déjà un compte ? <a href="/login" className="text-blue-600 hover:underline">Se connecter</a>
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}
