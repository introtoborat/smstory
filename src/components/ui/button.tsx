import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
    "transition-all duration-200 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary — vibrant violet, solid
        default:
          "bg-primary text-primary-foreground shadow-soft hover:bg-[var(--primary-hover)] hover:shadow-elev",
        // Gradient brand — premium violet→indigo hero
        gradient:
          "bg-brand-gradient text-white shadow-glow hover:brightness-[1.06] relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/15 before:to-transparent",
        // Warm gradient — accent violet-magenta for highlights
        warm:
          "bg-accent-gradient text-white shadow-elev hover:brightness-[1.06]",
        // Destructive
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90",
        // Outline — clean hairline border
        outline:
          "border border-border bg-card shadow-soft hover:bg-accent/60 hover:border-primary/30 text-foreground",
        // Secondary — quiet neutral surface
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        // Ghost
        ghost: "hover:bg-accent/70 hover:text-accent-foreground",
        // Link
        link: "text-primary underline-offset-4 hover:underline",
        // Soft — soft tinted background
        soft:
          "bg-primary/10 text-primary hover:bg-primary/[0.16]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-[0.95rem]",
        xl: "h-12 rounded-xl px-7 text-base font-semibold",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
