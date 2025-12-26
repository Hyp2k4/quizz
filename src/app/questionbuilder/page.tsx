"use client";

import QuizBuilder from "@/components/quiz/QuizBuilder";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";

export default function BuilderPage() {
    const { user, loading, login } = useAuth();

    if (loading) return <div className="min-h-screen bg-[rgb(var(--background))] flex items-center justify-center">Loading...</div>;

    if (!user) {
        return (
            <div className="min-h-screen bg-[rgb(var(--background))] font-[family-name:var(--font-geist-sans)]">
                <Navbar />
                <main className="container mx-auto px-4 py-8 pt-32 text-center max-w-md">
                    <div className="glass-card p-8 rounded-2xl space-y-6">
                         <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
                         <p className="text-[rgb(var(--muted-foreground))]">You must be logged in to create a new quiz.</p>
                         <Button onClick={() => login()} className="w-full">
                             Login with Google
                         </Button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[rgb(var(--background))] font-[family-name:var(--font-geist-sans)]">
            <Navbar />
            <main className="container mx-auto px-4 py-8 pt-24">
                <QuizBuilder />
            </main>
        </div>
    );
}
