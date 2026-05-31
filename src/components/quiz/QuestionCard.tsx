import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, HelpCircle, Lightbulb, Image, AlertTriangle, User as UserIcon, Highlighter, RotateCcw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserPresence } from "@/services/quizService";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const EditableRichText = ({ value, onChange, placeholder, className, style }: { value: string, onChange: (val: string) => void, placeholder: string, className?: string, style?: React.CSSProperties }) => {
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
            style={style}
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
    fontSize?: number;
    answerFontSize?: number;
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
            style={{ fontSize: question.answerFontSize ? `${question.answerFontSize}px` : undefined }}
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

    // Strip ALL html tags, keeping only plain text
    const stripHtml = (html: string) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    // Reset all formatting from selected text
    const resetFormat = () => {
        document.execCommand('removeFormat', false);
        document.execCommand('unlink', false);
    };

    // Reset all formatting of the ENTIRE answer content (open type)
    const resetAnswerFormat = () => {
        const plain = stripHtml(question.correctAnswer[0] || '');
        onUpdate(question.id, { correctAnswer: [plain] });
    };

    // Reset formatting of ALL options (single/multiple)
    const resetOptionsFormat = () => {
        const newOptions = question.options.map(stripHtml);
        const newCorrect = question.correctAnswer.map(c => stripHtml(c));
        onUpdate(question.id, { options: newOptions, correctAnswer: newCorrect });
    };

    // Rendering toolbar before textarea
    const renderTextToolbar = () => (
        <div className="flex flex-wrap gap-1.5 mb-2 items-center">
            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')} title="In đậm" className="font-bold bg-white dark:bg-zinc-800 border shadow-sm h-8 w-8 p-0">B</Button>
            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('italic')} title="In nghiêng" className="italic bg-white dark:bg-zinc-800 border shadow-sm h-8 w-8 p-0">I</Button>
            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('underline')} title="Gạch chân" className="underline bg-white dark:bg-zinc-800 border shadow-sm h-8 w-8 p-0">U</Button>
            <div className="flex items-center border shadow-sm bg-white dark:bg-zinc-800 h-8 rounded-md overflow-hidden">
                <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('highlight')} title="Highlight" className="text-amber-500 h-full w-8 p-0 rounded-none border-0 hover:bg-zinc-100 dark:hover:bg-zinc-700"><Highlighter className="h-4 w-4" /></Button>
                <input type="color" value={highlightColor} onChange={(e) => setHighlightColor(e.target.value)} className="h-full w-8 p-0 border-0 bg-transparent cursor-pointer" title="Chọn màu highlight" />
            </div>
            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={resetFormat} title="Xóa toàn bộ định dạng" className="bg-white dark:bg-zinc-800 border shadow-sm h-8 px-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs flex items-center gap-1">
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
            </Button>
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
                    <div className="flex items-center gap-1 sm:gap-1.5 border-l border-zinc-200 dark:border-white/5 ml-1 pl-1">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-md p-0.5" title="Cỡ chữ câu hỏi">
                                <span className="text-[8px] font-black text-zinc-400 px-1">Q</span>
                                <Button variant="ghost" size="sm" onClick={() => onUpdate(question.id, { fontSize: Math.max(12, (question.fontSize || 16) - 2) })} className="h-5 w-6 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-[10px]">-</Button>
                                <span className="text-[10px] font-bold w-5 text-center text-zinc-600">{question.fontSize || 16}</span>
                                <Button variant="ghost" size="sm" onClick={() => onUpdate(question.id, { fontSize: Math.min(48, (question.fontSize || 16) + 2) })} className="h-5 w-6 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-[10px]">+</Button>
                            </div>
                            <div className="flex items-center bg-emerald-50 dark:bg-emerald-900/20 rounded-md p-0.5" title="Cỡ chữ đáp án">
                                <span className="text-[8px] font-black text-emerald-500 px-1">A</span>
                                <Button variant="ghost" size="sm" onClick={() => onUpdate(question.id, { answerFontSize: Math.max(12, (question.answerFontSize || 14) - 2) })} className="h-5 w-6 p-0 text-emerald-600 hover:text-emerald-900 text-[10px]">-</Button>
                                <span className="text-[10px] font-bold w-5 text-center text-emerald-600">{question.answerFontSize || 14}</span>
                                <Button variant="ghost" size="sm" onClick={() => onUpdate(question.id, { answerFontSize: Math.min(48, (question.answerFontSize || 14) + 2) })} className="h-5 w-6 p-0 text-emerald-600 hover:text-emerald-900 text-[10px]">+</Button>
                            </div>
                        </div>
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
                  style={{ fontSize: question.fontSize ? `${question.fontSize}px` : undefined, lineHeight: 1.5 }}
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
                        <div className="flex gap-2 mt-2">
                            <Button variant="outline" size="sm" onClick={addOption} className="flex-1 border-dashed hover:border-[rgb(var(--primary))] hover:text-[rgb(var(--primary))]">
                                <Plus className="mr-2 h-4 w-4" /> {t.builder.addOption}
                            </Button>
                            <Button
                                variant="ghost" size="sm"
                                onClick={resetOptionsFormat}
                                title="Xóa toàn bộ định dạng của tất cả đáp án"
                                className="border border-red-200 dark:border-red-900/30 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs flex items-center gap-1 px-3"
                            >
                                <RotateCcw className="h-3 w-3" />
                                <span>Reset định dạng</span>
                            </Button>
                        </div>
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
                        <div className="flex flex-wrap gap-1.5 mb-2 mt-2 items-center">
                            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')} title="In đậm" className="font-bold bg-white dark:bg-zinc-800 border shadow-sm h-8 w-8 p-0">B</Button>
                            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('italic')} title="In nghiêng" className="italic bg-white dark:bg-zinc-800 border shadow-sm h-8 w-8 p-0">I</Button>
                            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('underline')} title="Gạch chân" className="underline bg-white dark:bg-zinc-800 border shadow-sm h-8 w-8 p-0">U</Button>
                            <div className="flex items-center border shadow-sm bg-white dark:bg-zinc-800 h-8 rounded-md overflow-hidden">
                                <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('highlight')} title="Highlight" className="text-amber-500 h-full w-8 p-0 rounded-none border-0 hover:bg-zinc-100 dark:hover:bg-zinc-700"><Highlighter className="h-4 w-4" /></Button>
                                <input type="color" value={highlightColor} onChange={(e) => setHighlightColor(e.target.value)} className="h-full w-8 p-0 border-0 bg-transparent cursor-pointer" title="Chọn màu highlight" />
                            </div>
                            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={resetFormat} title="Xóa định dạng vùng đang chọn" className="bg-white dark:bg-zinc-800 border shadow-sm h-8 px-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-xs flex items-center gap-1">
                                <RotateCcw className="h-3 w-3" />
                                <span>Reset vùng chọn</span>
                            </Button>
                            <Button variant="ghost" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={resetAnswerFormat} title="Xóa toàn bộ định dạng đáp án" className="bg-white dark:bg-zinc-800 border shadow-sm h-8 px-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs flex items-center gap-1">
                                <RotateCcw className="h-3 w-3" />
                                <span>Reset toàn bộ</span>
                            </Button>
                        </div>
                        <div className="bg-[rgb(var(--secondary))/30] rounded-xl p-3 border border-zinc-200 dark:border-white/10">
                            <EditableRichText
                                placeholder={t.builder.userAnswerPlaceholder}
                                value={question.correctAnswer[0] || ""}
                                onChange={(val) => onUpdate(question.id, { correctAnswer: [val] })}
                                className="min-h-[60px]"
                                style={{ fontSize: question.answerFontSize ? `${question.answerFontSize}px` : undefined }}
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
