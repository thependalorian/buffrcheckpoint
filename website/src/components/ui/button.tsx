import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--button-radius)] border border-transparent bg-clip-padding text-sm font-[weight:var(--button-font-weight)] whitespace-nowrap transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] outline-none select-none disabled:pointer-events-none disabled:bg-[var(--button-disabled-bg)] disabled:text-[var(--button-disabled-fg)] aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[var(--icon-sm)]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)] hover:bg-[var(--button-primary-bg-hover)] active:bg-[var(--button-primary-bg-active)]",
        outline:
          "border-[var(--button-secondary-border)] bg-[var(--button-secondary-bg)] text-[var(--button-secondary-fg)] hover:bg-[var(--button-secondary-bg-hover)] aria-expanded:bg-[var(--button-secondary-bg-hover)] disabled:border-[var(--border-subtle)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_srgb,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "text-[var(--button-ghost-fg)] hover:bg-[var(--button-ghost-bg-hover)] aria-expanded:bg-[var(--button-ghost-bg-hover)] disabled:bg-transparent",
        destructive:
          "bg-[var(--button-danger-bg)] text-[var(--button-danger-fg)] hover:bg-[var(--button-danger-bg-hover)]",
        link: "text-[var(--text-link)] underline-offset-4 hover:text-[var(--text-link-hover)] hover:underline disabled:bg-transparent",
      },
      size: {
        default:
          "h-[var(--button-height-md)] px-[var(--button-padding-x-md)] has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-[var(--radius-tag)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-[var(--icon-xs)]",
        sm: "h-[var(--button-height-sm)] gap-1.5 px-[var(--button-padding-x-sm)] text-sm in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        lg: "h-[var(--button-height-lg)] px-[var(--button-padding-x-lg)] text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4 [&_svg:not([class*='size-'])]:size-[var(--icon-md)]",
        icon: "size-[var(--button-height-md)]",
        "icon-xs":
          "size-6 rounded-[var(--radius-tag)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-[var(--icon-xs)]",
        "icon-sm": "size-[var(--button-height-sm)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-[var(--button-height-lg)] [&_svg:not([class*='size-'])]:size-[var(--icon-md)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
