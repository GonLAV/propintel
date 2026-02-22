"use client"

import { ComponentProps } from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-black/[0.05] text-black/45 inline-flex h-12 w-full items-center justify-center rounded-2xl p-1.5 gap-1",
        "dark:bg-white/[0.08] dark:text-white/40",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        /* Apple segmented control trigger */
        "inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl",
        "px-4 py-2 text-[14px] font-medium whitespace-nowrap",
        "transition-all duration-200 outline-none",
        "text-black/45 hover:text-black/65",
        "data-[state=active]:bg-white data-[state=active]:text-[#1d1d1f] data-[state=active]:font-semibold",
        "data-[state=active]:shadow-[0_1px_3px_oklch(0_0_0/0.08),0_0_0_0.5px_oklch(0_0_0/0.04)]",
        "focus-visible:ring-2 focus-visible:ring-primary/30",
        "disabled:pointer-events-none disabled:opacity-50",
        "dark:text-white/40 dark:hover:text-white/60",
        "dark:data-[state=active]:bg-white/[0.12] dark:data-[state=active]:text-white",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none mt-6 animate-fade-in", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
