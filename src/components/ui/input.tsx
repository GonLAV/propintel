import { ComponentProps } from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        /* Apple-style input */
        "flex h-11 w-full min-w-0 rounded-xl border border-black/[0.08] bg-white px-4 py-2",
        "text-[15px] text-[#1d1d1f] placeholder:text-black/30",
        "shadow-none transition-[border-color,box-shadow] outline-none",
        "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15",
        "hover:border-black/[0.12]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "dark:bg-white/[0.06] dark:border-white/[0.15] dark:text-white dark:placeholder:text-white/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
