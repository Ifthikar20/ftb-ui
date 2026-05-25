import { cva } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-[color:var(--chart-2)]/15 text-[color:var(--chart-2)]',
        warning: 'border-transparent bg-[color:var(--chart-3)]/15 text-[color:var(--chart-3)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
