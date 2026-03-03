import * as React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={
          "flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm " +
          "ring-offset-background placeholder:text-muted-foreground " +
          "hover:border-foreground/25 " +
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 " +
          "focus-visible:border-ring " +
          "disabled:cursor-not-allowed disabled:opacity-50 " +
          className
        }
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";