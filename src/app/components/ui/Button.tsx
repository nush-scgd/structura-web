import React from 'react';
import { cn } from '../../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center font-display tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none";
    
    const variants = {
      primary: "bg-charcoal text-ivory hover:bg-gold hover:text-charcoal border border-transparent",
      outline: "bg-transparent border border-charcoal text-charcoal hover:bg-charcoal hover:text-ivory",
      ghost: "bg-transparent text-charcoal hover:text-gold hover:bg-gray-100/50",
      gold: "bg-gold text-charcoal hover:bg-gold-dark border border-transparent"
    };

    const sizes = {
      sm: "h-9 px-4 text-xs uppercase",
      md: "h-11 px-6 text-sm uppercase",
      lg: "h-14 px-8 text-base uppercase"
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
