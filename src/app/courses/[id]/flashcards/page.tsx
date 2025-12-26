"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getQuizById, QuizData } from "@/services/quizService";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/Button";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, RotateCcw, ArrowLeft, Image as ImageIcon } from "lucide-react";

export default function FlashcardsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { t, language } = useLanguage();
    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            getQuizById(id as string).then(data => {
                setQuiz(data);
                setLoading(false);
            });
        }
    }, [id]);

    if (loading) return <div className="min-h-screen flex items-center justify-center">{t.common.loading}</div>;
    if (!quiz || !quiz.questions.length) return <div className="min-h-screen flex items-center justify-center">No cards found</div>;

    const currentQuestion = quiz.questions[currentIndex];
    const total = quiz.questions.length;

    const nextCard = () => {
        if (currentIndex < total - 1) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev + 1), 100);
        }
    };

    const prevCard = () => {
        if (currentIndex > 0) {
            setIsFlipped(false);
            setTimeout(() => setCurrentIndex(prev => prev - 1), 100);
        }
    };

    const handleRestart = () => {
        setCurrentIndex(0);
        setIsFlipped(false);
    };

    const isFinished = currentIndex === total - 1 && isFlipped;

    return (
        <div className="min-h-screen bg-[rgb(var(--background))]">
            <Navbar />
            <main className="pt-32 px-6 max-w-4xl mx-auto pb-20">
                <div className="mb-8 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => router.back()} className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> {t.flashcards.back}
                    </Button>
                    <div className="text-sm font-bold text-zinc-400">
                        {t.flashcards.progress}: {currentIndex + 1} / {total}
                    </div>
                </div>

                <div className="relative perspective-1000 min-h-[450px] w-full max-w-2xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentIndex}
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                            className="w-full h-full"
                        >
                            <div 
                                className={`flashcard-inner relative w-full h-[450px] transition-transform duration-700 cursor-pointer preserve-3d shadow-2xl rounded-[2.5rem] ${isFlipped ? 'rotate-y-180' : ''}`}
                                onClick={() => setIsFlipped(!isFlipped)}
                            >
                                {/* Front Side */}
                                <div className="flashcard-front absolute inset-0 backface-hidden bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center border-2 border-zinc-100 dark:border-zinc-800">
                                    <span className="absolute top-6 left-10 text-[10px] font-black uppercase tracking-widest text-indigo-500 opacity-50">
                                        {t.flashcards.frontLabel}
                                    </span>
                                    
                                    {currentQuestion.imageUrl && (
                                        <div className="w-full h-48 mb-6 rounded-2xl overflow-hidden bg-zinc-50 border border-zinc-100 dark:border-zinc-800">
                                            <img src={currentQuestion.imageUrl} alt="Card Front" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    
                                    <h2 className="text-2xl md:text-3xl font-bold text-zinc-800 dark:text-zinc-100 leading-tight">
                                        {currentQuestion.text}
                                    </h2>
                                    
                                    <p className="mt-8 text-sm text-zinc-400 font-medium animate-pulse">
                                        {t.flashcards.flip}
                                    </p>
                                </div>

                                {/* Back Side */}
                                <div className="flashcard-back absolute inset-0 backface-hidden rotate-y-180 bg-indigo-600 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center text-white">
                                    <span className="absolute top-6 left-10 text-[10px] font-black uppercase tracking-widest text-indigo-200 opacity-50">
                                        {t.flashcards.backLabel}
                                    </span>
                                    
                                    {currentQuestion.answerImageUrl && (
                                        <div className="w-full h-48 mb-6 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/20">
                                            <img src={currentQuestion.answerImageUrl} alt="Card Back" className="w-full h-full object-contain" />
                                        </div>
                                    )}

                                    <div className="space-y-4 max-w-full">
                                        <div className="text-2xl md:text-3xl font-black">
                                            {currentQuestion.correctAnswer.join(", ")}
                                        </div>
                                        {currentQuestion.explanation && (
                                            <p className="text-sm text-indigo-100 italic leading-relaxed">
                                                {currentQuestion.explanation}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <div className="mt-12 flex items-center justify-center gap-6">
                    <Button 
                        variant="outline" 
                        size="lg" 
                        className="h-14 w-14 rounded-full border-2 transition-all hover:scale-110"
                        onClick={prevCard}
                        disabled={currentIndex === 0}
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </Button>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-12 w-12 rounded-full text-zinc-400 hover:text-indigo-500 transition-colors"
                        onClick={handleRestart}
                        title={t.flashcards.restart}
                    >
                        <RotateCcw className="h-5 w-5" />
                    </Button>

                    <Button 
                        variant="secondary" 
                        size="lg" 
                        className="h-14 w-14 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 transition-all hover:scale-110"
                        onClick={nextCard}
                        disabled={currentIndex === total - 1}
                    >
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                </div>

                {currentIndex === total - 1 && isFlipped && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-12 p-8 bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-100 dark:border-emerald-800 rounded-[2rem] text-center"
                    >
                        <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-400">{t.flashcards.finished}</h3>
                        <div className="flex justify-center gap-4 mt-6">
                            <Button onClick={handleRestart} variant="outline" className="rounded-xl border-emerald-200 text-emerald-700">
                                {t.flashcards.restart}
                            </Button>
                            <Button onClick={() => router.back()} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
                                {t.flashcards.back}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </main>

            <style jsx global>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
                .flashcard-inner {
                    transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
                .preserve-3d {
                    transform-style: preserve-3d;
                }
            `}</style>
        </div>
    );
}
