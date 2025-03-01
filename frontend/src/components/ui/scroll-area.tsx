import * as React from "react"

import { cn } from "@/lib/utils"

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "vertical" | "horizontal"
  scrollbarClassName?: string
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, children, orientation = "vertical", scrollbarClassName, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        <div className={cn("h-full w-full overflow-auto", {
          "overflow-y-auto overflow-x-hidden": orientation === "vertical",
          "overflow-x-auto overflow-y-hidden": orientation === "horizontal",
        })}>
          {children}
        </div>
        <div className={cn("absolute right-0 top-0 h-full w-2", scrollbarClassName)} />
      </div>
    )
  }
)
ScrollArea.displayName = "ScrollArea"

export { ScrollArea } 