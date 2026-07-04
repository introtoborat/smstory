import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-soft",
        "transition-[box-shadow,transform,border-color] duration-300 ease-out",
        "hover:border-border hover:shadow-elev",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "text-base font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

/* Glass variant — translucent elevated surface (kept for auth/editor use) */
const CardGlass = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl glass text-card-foreground shadow-elev",
        "transition-all duration-300 ease-out",
        className
      )}
      {...props}
    />
  )
);
CardGlass.displayName = "CardGlass";

/* Warm variant — soft tinted surface (kept for stat cards; now a subtle violet wash) */
const CardWarm = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl bg-warm-gradient border border-border text-card-foreground shadow-soft",
        "transition-[box-shadow,transform,border-color] duration-300 ease-out hover-lift",
        className
      )}
      {...props}
    />
  )
);
CardWarm.displayName = "CardWarm";

/* Gradient variant — violet hero surface */
const CardGradient = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl text-white shadow-glow",
        "bg-brand-gradient",
        "transition-all duration-300 ease-out hover-lift",
        className
      )}
      {...props}
    />
  )
);
CardGradient.displayName = "CardGradient";

export {
  Card,
  CardGlass,
  CardWarm,
  CardGradient,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
