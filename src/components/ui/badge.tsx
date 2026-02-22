import { ComponentProps } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full px-3 py-0.5 text-[12px] font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        success:
          "bg-emerald-500/10 text-emerald-700",
        default:
          "bg-primary text-white [a&]:hover:bg-primary/90",
        secondary:
          "bg-black/[0.05] text-[#1d1d1f] [a&]:hover:bg-black/[0.08]",
        destructive:
          "bg-red-500/10 text-red-700 [a&]:hover:bg-red-500/15",
        outline:
          "border border-black/[0.10] text-[#1d1d1f] [a&]:hover:bg-black/[0.03]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
