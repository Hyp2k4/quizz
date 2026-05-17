import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, HelpCircle, Lightbulb, Image, AlertTriangle, User as UserIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserPresence } from "@/services/quizService";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export type QuestionType = "single" | "multiple" | "open" | "mixed";

export interface Question {
    id: string;
    text: string;
    type: QuestionType;
    options: string[];
    correctAnswer: string[]; // Array of correct options
    hint: string;
    explanation: string;
    imageUrl?: string;
    answerImageUrl?: string;
}

interface QuestionCardProps {
    question: Question;
    index: number;
    activeEditors?: UserPresence[];
    onUpdate: (id: string, updates: Partial<Question>) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
    onFocus?: (id: string | null) => void;
}

export function QuestionCard({ question, index, activeEditors = [], onUpdate, onDelete, onDuplicate, onFocus }: QuestionCardProps) {
    const { t, language } = useLanguage();
    const [showCollisionWarning, setShowCollisionWarning] = useState(false);
    const [isAcknowledged, setIsAcknowledged] = useState(false);

    const checkCollision = (e: React.FocusEvent | React.MouseEvent) => {
        if (activeEditors.length > 0 && !isAcknowledged) {
            e.preventDefault();
            setShowCollisionWarning(true);
            return false;
        }
        if (onFocus) onFocus(question.id);
        return true;
    };

    const handleOptionChange = (optIndex: number, value: string) => {
        const newOptions = [...question.options];
        const oldOption = newOptions[optIndex];
        newOptions[optIndex] = value;

        let newCorrect = [...question.correctAnswer];
        if (newCorrect.includes(oldOption)) {
            newCorrect = newCorrect.map(a => a === oldOption ? value : a);
        }

        onUpdate(question.id, { options: newOptions, correctAnswer: newCorrect });
    };

    const addOption = () => {
        onUpdate(question.id, { options: [...question.options, ""] });
    };

    const removeOption = (optIndex: number) => {
        const optionToRemove = question.options[optIndex];
        const newOptions = question.options.filter((_, i) => i !== optIndex);
        const newCorrect = question.correctAnswer.filter(a => a !== optionToRemove);
        onUpdate(question.id, { options: newOptions, correctAnswer: newCorrect });
    };

    const toggleAnswer = (opt: string) => {
        if (question.type === 'single' || question.type === 'mixed') {
            onUpdate(question.id, { correctAnswer: [opt] });
        } else {
            const current = question.correctAnswer;
            if (current.includes(opt)) {
                onUpdate(question.id, { correctAnswer: current.filter(a => a !== opt) });
            } else {
                onUpdate(question.id, { correctAnswer: [...current, opt] });
            }
        }
    };

    const hasNoCorrectAnswer = question.type !== 'open' && question.correctAnswer.length === 0;

    return (
        <Card className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg border-[rgb(var(--border))] group ${hasNoCorrectAnswer ? 'opacity-60 grayscale-[0.3]' : ''}`}>
            <div className="absolute top-0 left-0 w-1 h-full bg-[rgb(var(--primary))] opacity-0 group-hover:opacity-100 transition-opacity" />

            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-white/5">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 text-white font-black text-xl shadow-lg shadow-sky-500/20">
                        {index + 1}
                    </div>
                    <div className="space-y-1 overflow-hidden">
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                            {t.builder.question}
                            {activeEditors.length > 0 && (
                                <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full text-[9px] animate-pulse normal-case font-bold">
                                    <UserIcon className="h-2.5 w-2.5" />
                                    {activeEditors.map(e => e.userName).join(", ")}
                                </span>
                            )}
                        </CardTitle>
                        <p className="text-xs text-zinc-500 font-bold sm:hidden truncate">
                            {t.builder.types[question.type]}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto bg-zinc-50 dark:bg-zinc-900/50 p-1 sm:p-0 rounded-xl sm:bg-transparent sm:dark:bg-transparent">
                    <Select
                        value={question.type}
                        onChange={(e) => onUpdate(question.id, { type: e.target.value as QuestionType, correctAnswer: [] })}
                        className="flex-1 sm:w-40 h-9 sm:h-8 text-xs font-black uppercase tracking-wider bg-white dark:bg-zinc-800 border-zinc-200/50 dark:border-white/5"
                    >
                        <option value="single">{t.builder.types.single}</option>
                        <option value="multiple">{t.builder.types.multiple}</option>
                        <option value="open">{t.builder.types.open}</option>
                        <option value="mixed">{t.builder.types.mixed}</option>
                    </Select>
                    <div className="flex items-center gap-1 sm:gap-2 border-l border-zinc-200 dark:border-white/5 ml-1 pl-1">
                        <Button variant="ghost" size="icon" onClick={() => onDuplicate(question.id)} className="h-9 w-9 sm:h-8 sm:w-8 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors" title={language === 'vi' ? 'Nhân bản' : 'Duplicate'}>
                            <Plus className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(question.id)} className="h-9 w-9 sm:h-8 sm:w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-6" onFocusCapture={(e) => {
                const canProceed = checkCollision(e);
                if (!canProceed) {
                    (e.target as HTMLElement).blur();
                }
            }}>
                <ConfirmDialog
                    isOpen={showCollisionWarning}
                    onCancel={() => setShowCollisionWarning(false)}
                    onConfirm={() => {
                        setIsAcknowledged(true);
                        setShowCollisionWarning(false);
                    }}
                    title={t.visibility.collaborationWarning.replace("{name}", activeEditors.map(e => e.userName).join(", "))}
                    description=""
                    confirmText={t.common.save}
                    variant="danger"
                />
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-[rgb(var(--muted-foreground))] uppercase tracking-wider">{t.builder.statement}</label>
                        <div className="flex items-center gap-2">
                            <Image className="h-3 w-3 text-sky-500" />
                            <input 
                                type="text" 
                                placeholder="Image URL (optional)" 
                                value={question.imageUrl || ""} 
                                onChange={(e) => onUpdate(question.id, { imageUrl: e.target.value })}
                                className="text-[10px] bg-transparent border-b border-zinc-200 focus:border-sky-500 outline-none w-32 md:w-48"
                            />
                        </div>
                    </div>
                    <Textarea
                        placeholder={t.builder.statementPlaceholder}
                        value={question.text}
                        onChange={(e) => onUpdate(question.id, { text: e.target.value })}
                        className="text-base md:text-xl font-bold leading-relaxed resize-none bg-transparent border-none focus:ring-0 px-0 transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                        rows={2}
                    />
                    {question.imageUrl && (
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 group/img max-w-sm mx-auto">
                            <img src={question.imageUrl} alt="Question" className="w-full h-full object-contain" />
                            <Button 
                                variant="destructive" 
                                size="icon" 
                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/img:opacity-100 transition-opacity"
                                onClick={() => onUpdate(question.id, { imageUrl: "" })}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </div>

                {(question.type === "single" || question.type === "multiple" || question.type === "mixed") && (
                    <div className="space-y-3 animation-fade-in">
                        <label className="text-xs font-medium text-[rgb(var(--muted-foreground))] uppercase tracking-wider flex justify-between">
                            <span>{t.builder.options}</span>
                            {question.type === "mixed" && <span className="text-[rgb(var(--primary))] text-[10px] bg-[rgb(var(--primary))/10] px-2 py-0.5 rounded-full">{t.builder.part1}</span>}
                        </label>
                        <div className="grid gap-3">
                            {question.options.map((opt, i) => {
                                const isSelected = question.correctAnswer.includes(opt);
                                return (
                                    <div key={i} className="flex items-center gap-2 group/opt">
                                        <div
                                            className={`flex items-center justify-center h-5 w-5 cursor-pointer transition-all ${question.type === 'multiple' ? 'rounded-md' : 'rounded-full'} border ${isSelected && opt !== "" ? "bg-[rgb(var(--primary))] border-[rgb(var(--primary))]" : "border-[rgb(var(--muted-foreground))] hover:border-[rgb(var(--primary))]"}`}
                                            onClick={() => toggleAnswer(opt)}
                                        >
                                            {isSelected && opt !== "" && (
                                                question.type === 'multiple'
                                                    ? <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                    : <div className="h-2 w-2 rounded-full bg-white" />
                                            )}
                                        </div>

                                        <Input
                                            value={opt}
                                            onChange={(e) => handleOptionChange(i, e.target.value)}
                                            placeholder={`${t.builder.optionPlaceholder} ${i + 1}`}
                                            className="flex-1 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-white/5 hover:border-sky-500/50 focus:border-sky-500 focus:bg-white dark:focus:bg-zinc-900 transition-all h-11 sm:h-10 text-sm font-medium rounded-xl"
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeOption(i)} className="h-8 w-8 opacity-0 group-hover/opt:opacity-100 transition-opacity">
                                            <Trash2 className="h-4 w-4 text-[rgb(var(--muted-foreground))]" />
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                        <Button variant="outline" size="sm" onClick={addOption} className="w-full mt-2 border-dashed hover:border-[rgb(var(--primary))] hover:text-[rgb(var(--primary))]">
                            <Plus className="mr-2 h-4 w-4" /> {t.builder.addOption}
                        </Button>
                    </div>
                )}

                {question.type === "mixed" && (
                    <div className="space-y-2 pt-4 border-t border-dashed border-[rgb(var(--border))]">
                        <label className="text-xs font-medium text-[rgb(var(--muted-foreground))] uppercase tracking-wider flex justify-between">
                            <span>{t.builder.detailedAnswer}</span>
                            <span className="text-sky-500 text-[10px] bg-sky-500/10 px-2 py-0.5 rounded-full">{t.builder.part2}</span>
                        </label>
                        <Textarea
                            placeholder={t.builder.userAnswerPlaceholder}
                            disabled
                            className="bg-[rgb(var(--secondary))/50] italic text-[rgb(var(--muted-foreground))]"
                        />
                    </div>
                )}

                {question.type === "open" && (
                    <div className="space-y-2 pt-4 border-t border-dashed border-[rgb(var(--border))]">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-[rgb(var(--muted-foreground))] uppercase tracking-wider">
                                {t.builder.modelAnswer}
                            </label>
                            <div className="flex items-center gap-2">
                                <Image className="h-3 w-3 text-emerald-500" />
                                <input 
                                    type="text" 
                                    placeholder="Answer Image URL (optional)" 
                                    value={question.answerImageUrl || ""} 
                                    onChange={(e) => onUpdate(question.id, { answerImageUrl: e.target.value })}
                                    className="text-[10px] bg-transparent border-b border-zinc-200 focus:border-sky-500 outline-none w-32 md:w-48"
                                />
                            </div>
                        </div>
                        <Textarea
                            placeholder={t.builder.userAnswerPlaceholder}
                            value={question.correctAnswer[0] || ""}
                            onChange={(e) => onUpdate(question.id, { correctAnswer: [e.target.value] })}
                            className="bg-[rgb(var(--secondary))/30]"
                        />
                        {question.answerImageUrl && (
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-100 group/ansimg max-w-sm mx-auto">
                                <img src={question.answerImageUrl} alt="Answer" className="w-full h-full object-contain" />
                                <Button 
                                    variant="destructive" 
                                    size="icon" 
                                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/ansimg:opacity-100 transition-opacity"
                                    onClick={() => onUpdate(question.id, { answerImageUrl: "" })}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-zinc-100 dark:border-white/5">
                    <div className="space-y-2 group/hint">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-zinc-400 group-focus-within/hint:text-amber-500 transition-colors">
                            <Lightbulb className="h-3.5 w-3.5" />
                            {t.builder.hint}
                        </div>
                        <Input
                            value={question.hint}
                            onChange={(e) => onUpdate(question.id, { hint: e.target.value })}
                            placeholder={t.builder.hintPlaceholder}
                            className="text-xs bg-zinc-50 dark:bg-zinc-900/50 border-transparent focus:border-amber-500/50 rounded-xl transition-all h-10"
                        />
                    </div>

                    <div className="space-y-2 group/expl">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-zinc-400 group-focus-within/expl:text-blue-500 transition-colors">
                            <HelpCircle className="h-3.5 w-3.5" />
                            {t.builder.explanation}
                        </div>
                        <Input
                            value={question.explanation}
                            onChange={(e) => onUpdate(question.id, { explanation: e.target.value })}
                            placeholder={t.builder.explanationPlaceholder}
                            className="text-xs bg-zinc-50 dark:bg-zinc-900/50 border-transparent focus:border-blue-500/50 rounded-xl transition-all h-10"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
