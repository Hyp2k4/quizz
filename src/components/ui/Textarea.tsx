import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { }

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-[80px] w-full rounded-xl border border-[rgb(var(--input))] bg-transparent px-3 py-2 text-sm text-[rgb(var(--foreground))] shadow-sm placeholder:text-[rgb(var(--muted-foreground))] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgb(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Textarea.displayName = "Textarea";

export { Textarea };
