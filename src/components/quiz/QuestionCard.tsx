import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, HelpCircle, Lightbulb, Image, AlertTriangle, User as UserIcon, Highlighter } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserPresence } from "@/services/quizService";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const EditableRichText = ({ value, onChange, placeholder, className }: { value: string, onChange: (val: string) => void, placeholder: string, className?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (ref.current && value !== ref.current.innerHTML) {
            ref.current.innerHTML = value || '';
        }
    }, [value]);

    return (
        <div
            ref={ref}
            contentEditable
            suppressContentEditableWarning
            className={`outline-none cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 empty:before:pointer-events-none ${className}`}
            data-placeholder={placeholder}
            onInput={(e) => onChange(e.currentTarget.innerHTML)}
            onBlur={(e) => onChange(e.currentTarget.innerHTML)}
        />
    );
};

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
    const [highlightColor, setHighlightColor] = useState('#ffff00');

    const checkCollision = (e: React.FocusEvent | React.MouseEvent) => {
        if (activeEditors.length > 0 && !isAcknowledged) {
            e.preventDefault();
            setShowCollisionWarning(true);
            return false;
        }
        if (onFocus) onFocus(question.id);
        return true;
    };

    // Rich text format commands
    const applyFormat = (command: string, value?: string) => {
        if (command === 'highlight') {
            const color = value || highlightColor;
            document.execCommand('backColor', false, color);
            document.execCommand('hiliteColor', false, color);
            
            // Calculate contrast for text color if the color overlaps
            let hex = color.replace("#", "");
            if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }
            if (hex.length === 6) {
                const r = parseInt(hex.substring(0, 2), 16);
                const g = parseInt(hex.substring(2, 4), 16);
                const b = parseInt(hex.substring(4, 6), 16);
                const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                const textColor = (yiq >= 128) ? '#000000' : '#ffffff';
                document.execCommand('foreColor', false, textColor);
            }
        } else {
            document.execCommand(command, false, value);
        }
    };

    // Render question text with possible formatting
    const renderRichText = (html: string) => (
      <span dangerouslySetInnerHTML={{ __html: html }} />
    );

    // Updated option rendering with formatting buttons
    const renderOption = (opt: string, idx: number) => {
      const isSelected = question.correctAnswer.includes(opt);
      const isActive = isSelected;
      return (
        <div key={idx} className="flex items-center gap-2 group/opt">
          <div
            className={`flex items-center justify-center h-5 w-5 cursor-pointer transition-all ${question.type === 'multiple' ? 'rounded-md' : 'rounded-full'} border ${isActive && opt !== '' ? 'bg-[rgb(var(--primary))] border-[rgb(var(--primary))]' : 'border-[rgb(var(--muted-foreground))] hover:border-[rgb(var(--primary))]'}`}
            onClick={() => toggleAnswer(opt)}
          >
            {isActive && opt !== '' && (
              question.type === 'multiple' ? (
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <div className="h-2 w-2 rounded-full bg-white" />
              )
            )}
          </div>
          <EditableRichText
            value={opt}
            onChange={(newVal) => handleOptionChange(idx, newVal)}
            placeholder={`${t.builder.optionPlaceholder} ${idx + 1}`}
            className={`flex-1 transition-all min-h-[40px] py-2 px-3 text-sm rounded-xl border ${
              isActive 
                ? 'bg-amber-100 dark:bg-amber-900/40 border-amber-500 text-amber-900 dark:text-amber-100 font-bold focus:ring-2 focus:ring-amber-500/50' 
                : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/10 hover:border-sky-500/50 focus:border-sky-500 focus:bg-white dark:focus:bg-zinc-900 font-medium'
            }`}
          />
          <Button variant="ghost" size="icon" onClick={() => removeOption(idx)} className="h-8 w-8 opacity-0 group-hover/opt:opacity-100 transition-opacity shrink-0">
            <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-500" />
          </Button>
        </div>
      );
    };

    // Updated question title rendering with formatting (question.text may contain HTML tags)
    const renderQuestionTitle = (text: string) => (
      <h3 className="font-semibold text-lg mb-4 text-zinc-800 dark:text-zinc-100" dangerouslySetInnerHTML={{ __html: text }} />
    );

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

    // Rendering toolbar before textarea
    const renderTextToolbar = () => (
        <div className="flex space-x-2 mb-2 items-center">
            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')} title="Bold" className="font-bold bg-white dark:bg-zinc-800 border shadow-sm h-8 w-8 p-0">B</Button>
            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('underline')} title="Underline" className="underline bg-white dark:bg-zinc-800 border shadow-sm h-8 w-8 p-0">U</Button>
            <div className="flex items-center border shadow-sm bg-white dark:bg-zinc-800 h-8 rounded-md overflow-hidden">
                <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('highlight')} title="Highlight" className="text-amber-500 h-full w-8 p-0 rounded-none border-0 hover:bg-zinc-100 dark:hover:bg-zinc-700"><Highlighter className="h-4 w-4" /></Button>
                <input type="color" value={highlightColor} onChange={(e) => setHighlightColor(e.target.value)} className="h-full w-8 p-0 border-0 bg-transparent cursor-pointer" title="Choose highlight color" />
            </div>
        </div>
    );

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


            {renderTextToolbar()}
            <div className="bg-white/50 dark:bg-black/20 rounded-xl p-3 border border-zinc-200 dark:border-white/10">
                <EditableRichText
                  placeholder={t.builder.statementPlaceholder}
                  value={question.text}
                  onChange={(val) => onUpdate(question.id, { text: val })}
                  className="text-base md:text-xl font-bold leading-relaxed min-h-[80px]"
                />
            </div>

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
                            {question.options.map((opt, idx) => renderOption(opt, idx))}
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
                        <div className="flex space-x-2 mb-2 mt-2 items-center">
                            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')} title="Bold" className="font-bold bg-white dark:bg-zinc-800 border shadow-sm h-8 w-8 p-0">B</Button>
                            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('underline')} title="Underline" className="underline bg-white dark:bg-zinc-800 border shadow-sm h-8 w-8 p-0">U</Button>
                            <div className="flex items-center border shadow-sm bg-white dark:bg-zinc-800 h-8 rounded-md overflow-hidden">
                                <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('highlight')} title="Highlight" className="text-amber-500 h-full w-8 p-0 rounded-none border-0 hover:bg-zinc-100 dark:hover:bg-zinc-700"><Highlighter className="h-4 w-4" /></Button>
                                <input type="color" value={highlightColor} onChange={(e) => setHighlightColor(e.target.value)} className="h-full w-8 p-0 border-0 bg-transparent cursor-pointer" title="Choose highlight color" />
                            </div>
                        </div>
                        <div className="bg-[rgb(var(--secondary))/30] rounded-xl p-3 border border-zinc-200 dark:border-white/10">
                            <EditableRichText
                                placeholder={t.builder.userAnswerPlaceholder}
                                value={question.correctAnswer[0] || ""}
                                onChange={(val) => onUpdate(question.id, { correctAnswer: [val] })}
                                className="min-h-[60px]"
                            />
                        </div>
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
