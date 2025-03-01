import * as React from "react";

import { cn } from "./utils";

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
	title?: string;
	description?: string;
	variant?: "default" | "success" | "destructive";
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
	({ className, title, description, variant = "default", ...props }, ref) => {
		return (
			<div
				ref={ref}
				className={cn(
					"fixed bottom-4 right-4 z-50 rounded-md border p-4 shadow-md transition-all",
					variant === "default" && "bg-background text-foreground",
					variant === "success" &&
						"bg-green-100 text-green-900 border-green-200",
					variant === "destructive" &&
						"bg-destructive/15 text-destructive border-destructive/20",
					className,
				)}
				{...props}
			>
				{title && <h4 className="font-medium mb-1">{title}</h4>}
				{description && <p className="text-sm opacity-90">{description}</p>}
			</div>
		);
	},
);
Toast.displayName = "Toast";

interface ToastContextType {
	toast: (props: ToastProps) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(
	undefined,
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = React.useState<(ToastProps & { id: string })[]>(
		[],
	);

	const toast = React.useCallback((props: ToastProps) => {
		const id = Math.random().toString(36).substring(2, 9);
		setToasts((prev) => [...prev, { ...props, id }]);

		// Auto-dismiss after 3 seconds
		setTimeout(() => {
			setToasts((prev) => prev.filter((t) => t.id !== id));
		}, 3000);
	}, []);

	return (
		<ToastContext.Provider value={{ toast }}>
			{children}
			{toasts.map((t) => (
				<Toast
					key={t.id}
					title={t.title}
					description={t.description}
					variant={t.variant}
				/>
			))}
		</ToastContext.Provider>
	);
}

export function useToast() {
	const context = React.useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within a ToastProvider");
	}
	return context;
}
