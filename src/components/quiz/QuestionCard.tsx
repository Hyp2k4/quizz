import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, HelpCircle, Lightbulb } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type QuestionType = "single" | "multiple" | "open" | "mixed";

export interface Question {
    id: string;
    text: string;
    type: QuestionType;
    options: string[];
    correctAnswer: string[]; // Array of correct options
    hint: string;
    explanation: string;
}

interface QuestionCardProps {
    question: Question;
    index: number;
    onUpdate: (id: string, updates: Partial<Question>) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
}

export function QuestionCard({ question, index, onUpdate, onDelete, onDuplicate }: QuestionCardProps) {
    const { t } = useLanguage();

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

            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(var(--primary))/10] text-sm font-bold text-[rgb(var(--primary))]">
                        {index + 1}
                    </span>
                    <CardTitle className="text-base">{t.builder.question} {index + 1}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        value={question.type}
                        onChange={(e) => onUpdate(question.id, { type: e.target.value as QuestionType, correctAnswer: [] })}
                        className="w-40 h-8 text-xs font-medium"
                    >
                        <option value="single">{t.builder.types.single}</option>
                        <option value="multiple">{t.builder.types.multiple}</option>
                        <option value="open">{t.builder.types.open}</option>
                        <option value="mixed">{t.builder.types.mixed}</option>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => onDuplicate(question.id)} className="h-8 w-8 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50" title="Duplicate">
                        <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(question.id)} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-[rgb(var(--muted-foreground))] uppercase tracking-wider">{t.builder.statement}</label>
                    <Textarea
                        placeholder={t.builder.statementPlaceholder}
                        value={question.text}
                        onChange={(e) => onUpdate(question.id, { text: e.target.value })}
                        className="text-lg font-medium resize-none bg-transparent focus:bg-[rgb(var(--secondary))/30] transition-colors"
                        rows={2}
                    />
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
                                            className="flex-1 bg-[rgb(var(--secondary))/30] border-transparent hover:border-[rgb(var(--input))] focus:border-[rgb(var(--primary))] focus:bg-transparent transition-all"
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
                            <span className="text-indigo-500 text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded-full">{t.builder.part2}</span>
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
                        <label className="text-xs font-medium text-[rgb(var(--muted-foreground))] uppercase tracking-wider">
                            {t.builder.modelAnswer}
                        </label>
                        <Textarea
                            placeholder={t.builder.userAnswerPlaceholder}
                            value={question.correctAnswer[0] || ""}
                            onChange={(e) => onUpdate(question.id, { correctAnswer: [e.target.value] })}
                            className="bg-[rgb(var(--secondary))/30]"
                        />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-[rgb(var(--border))]">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[rgb(var(--muted-foreground))]">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                            {t.builder.hint}
                        </div>
                        <Input
                            value={question.hint}
                            onChange={(e) => onUpdate(question.id, { hint: e.target.value })}
                            placeholder={t.builder.hintPlaceholder}
                            className="text-sm bg-[rgb(var(--secondary))/20]"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-[rgb(var(--muted-foreground))]">
                            <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
                            {t.builder.explanation}
                        </div>
                        <Input
                            value={question.explanation}
                            onChange={(e) => onUpdate(question.id, { explanation: e.target.value })}
                            placeholder={t.builder.explanationPlaceholder}
                            className="text-sm bg-[rgb(var(--secondary))/20]"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
