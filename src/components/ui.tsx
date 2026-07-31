import { cva, type VariantProps } from 'class-variance-authority'
import { type ButtonHTMLAttributes, forwardRef, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-line bg-card', className)} {...props} />
}

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger'; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]', {
    'border-white/10 bg-white/[0.045] text-muted-foreground': tone === 'neutral',
    'border-accent/20 bg-accent/10 text-accent': tone === 'success',
    'border-warning/20 bg-warning/10 text-warning': tone === 'warning',
    'border-danger/20 bg-danger/10 text-danger': tone === 'danger'
  }, className)}>{children}</span>
}

const buttonVariants = cva('inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]', {
  variants: {
    variant: {
      default: 'bg-accent text-[#071009] hover:bg-accent/90',
      secondary: 'border border-white/10 bg-white/[0.055] text-foreground hover:bg-white/[0.09]',
      ghost: 'text-muted-foreground hover:bg-white/[0.055] hover:text-foreground',
      danger: 'bg-danger/15 text-danger hover:bg-danger/20'
    },
    size: { default: '', icon: 'size-9 p-0', sm: 'min-h-7 rounded-md px-2.5 text-[10px]' }
  },
  defaultVariants: { variant: 'default', size: 'default' }
})

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('h-9 w-full rounded-lg border border-line bg-black/20 px-2.5 text-xs text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent/45 focus:ring-1 focus:ring-accent/10', className)} {...props} />
})

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn('relative h-7 w-12 rounded-full border transition', checked ? 'border-accent/50 bg-accent/25' : 'border-white/10 bg-white/[0.06]')}>
    <span className={cn('absolute top-1 size-[18px] rounded-full transition-all', checked ? 'left-6 bg-accent' : 'left-1 bg-muted-foreground')} />
  </button>
}

export function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <div className="flex min-h-56 flex-col items-center justify-center px-8 text-center">
    <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-white/[0.05] text-muted-foreground">{icon}</div>
    <p className="font-semibold">{title}</p>
    <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
  </div>
}
