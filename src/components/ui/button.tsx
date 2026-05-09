import * as React from "react"
import {cva, type VariantProps} from "class-variance-authority"
import {Slot} from "radix-ui"

import {cn} from "@skillforge/vite/lib/utils"

const buttonVariants = cva(
    "group/button inline-flex shrink-0 items-center justify-center rounded-2xl border border-transparent bg-clip-padding text-sm font-bold whitespace-nowrap transition-all outline-none select-none focus-visible:border-blue-400/70 focus-visible:ring-3 focus-visible:ring-blue-500/20 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                default: "glass-button text-white",
                outline:
                    "glass-button-secondary text-slate-900 hover:text-slate-900 dark:text-slate-100 dark:hover:text-white",
                secondary:
                    "glass-chip text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
                ghost:
                    "bg-transparent text-slate-700 hover:bg-blue-500/10 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-500/15 dark:hover:text-blue-200",
                destructive:
                    "border border-red-400/20 bg-red-500/10 text-red-700 hover:bg-red-500/20 focus-visible:ring-red-500/20 dark:text-red-300",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default:
                    "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
                xs: "h-8 gap-1.5 rounded-2xl px-2.5 text-xs in-data-[slot=button-group]:rounded-2xl has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
                sm: "h-9 gap-1.5 rounded-2xl px-3 text-sm in-data-[slot=button-group]:rounded-2xl has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
                lg: "h-11 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
                icon: "size-10 rounded-2xl",
                "icon-xs":
                    "size-8 rounded-2xl in-data-[slot=button-group]:rounded-2xl [&_svg:not([class*='size-'])]:size-3",
                "icon-sm":
                    "size-9 rounded-2xl in-data-[slot=button-group]:rounded-2xl",
                "icon-lg": "size-11 rounded-2xl",
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
            className={cn(buttonVariants({variant, size, className}))}
            {...props}
        />
    )
}

export {Button}
