"use client";

export type AnswerRevealMode = "immediate" | "after-submit";

export function AnswerRevealModeSelector({
    value,
    onChange,
    language
}: {
    value: AnswerRevealMode;
    onChange: (value: AnswerRevealMode) => void;
    language: string;
}) {
    const choices: { value: AnswerRevealMode; title: string; description: string }[] = language === "vi"
        ? [
            {
                value: "immediate",
                title: "Hiện đáp án ngay",
                description: "Xem đúng/sai sau khi chọn hoặc kiểm tra từng câu."
            },
            {
                value: "after-submit",
                title: "Chỉ hiện sau khi nộp bài",
                description: "Hoàn thành bài rồi xem toàn bộ câu hỏi và kết quả."
            }
        ]
        : [
            {
                value: "immediate",
                title: "Show answers immediately",
                description: "See correct/incorrect feedback after answering or checking each question."
            },
            {
                value: "after-submit",
                title: "Show answers after submission",
                description: "Finish the quiz, then review all questions and results."
            }
        ];

    return (
        <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                {language === "vi" ? "Cách hiển thị đáp án" : "Answer feedback"}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
                {choices.map(choice => (
                    <label
                        key={choice.value}
                        className={`flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition-colors ${
                            value === choice.value
                                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40"
                        }`}
                    >
                        <input
                            type="radio"
                            name="answerRevealMode"
                            value={choice.value}
                            checked={value === choice.value}
                            onChange={() => onChange(choice.value)}
                            className="mt-1 accent-indigo-600"
                        />
                        <span>
                            <span className="block text-sm font-bold text-zinc-800 dark:text-zinc-100">{choice.title}</span>
                            <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">{choice.description}</span>
                        </span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
