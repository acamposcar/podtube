import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
	{
		variants: {
			variant: {
				default:
					"bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
				outline:
					"border border-input bg-background hover:bg-accent hover:text-accent-foreground",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
				youtube: "bg-youtube-red text-white hover:bg-youtube-red/90 shadow-sm",
				glass:
					"bg-white/80 backdrop-blur-md border border-white/20 text-foreground hover:bg-white/90 dark:bg-black/50 dark:hover:bg-black/60 dark:border-white/10 dark:text-white",
				subtle:
					"bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
				gradient:
					"bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-sm",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-9 rounded-md px-3 text-xs",
				lg: "h-11 rounded-md px-8 text-base",
				xl: "h-12 rounded-md px-10 text-base",
				icon: "h-10 w-10",
				"icon-sm": "h-8 w-8 rounded-md",
			},
			rounded: {
				default: "rounded-md",
				full: "rounded-full",
				none: "rounded-none",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
			rounded: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, rounded, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, rounded, className }))}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
