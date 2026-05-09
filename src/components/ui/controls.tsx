import * as React from 'react';
import {Search} from 'lucide-react';
import {cn} from '@skillforge/vite/lib/utils';

type InputProps = React.ComponentProps<'input'>;
type TextareaProps = React.ComponentProps<'textarea'>;
type SelectProps = React.ComponentProps<'select'>;
type ButtonProps = React.ComponentProps<'button'>;
type Tone = 'blue' | 'green' | 'amber' | 'red' | 'slate';

export function Input({className, ...props}: InputProps) {
    return <input {...props} className={cn('glass-control w-full rounded-2xl px-4 py-3 outline-none', className)}/>;
}

export function Textarea({className, ...props}: TextareaProps) {
    return (
        <textarea
            {...props}
            className={cn(
                'glass-control min-h-28 w-full rounded-2xl px-4 py-3 outline-none resize-y',
                className,
            )}
        />
    );
}

export function Select({className, ...props}: SelectProps) {
    return (
        <select
            {...props}
            className={cn(
                'glass-control w-full rounded-2xl px-4 py-3 pr-10 outline-none appearance-none',
                className,
            )}
        />
    );
}

export function GlassButton({
                                className,
                                type = 'button',
                                ...props
                            }: ButtonProps) {
    return (
        <button
            {...props}
            type={type}
            className={cn(
                'glass-button inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
        />
    );
}

export function GlassSecondaryButton({className, type = 'button', ...props}: ButtonProps) {
    return (
        <button
            {...props}
            type={type}
            className={cn(
                'glass-button-secondary inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50',
                className,
            )}
        />
    );
}

export function Badge({
                          className,
                          tone = 'blue',
                          ...props
                      }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
    const toneClass: Record<Tone, string> = {
        blue: 'bg-blue-500/12 text-blue-700 dark:text-blue-300',
        green: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
        amber: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
        red: 'bg-red-500/12 text-red-700 dark:text-red-300',
        slate: 'bg-slate-500/12 text-slate-700 dark:text-slate-300',
    };

    return <span {...props}
                 className={cn('glass-chip inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider', toneClass[tone], className)}/>;
}

export function Switch({
                           checked,
                           onCheckedChange,
                           className,
                           ...props
                       }: Omit<ButtonProps, 'onChange' | 'type'> & {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <button
            {...props}
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onCheckedChange(!checked)}
            className={cn(
                'glass-chip relative inline-flex h-8 w-14 items-center rounded-full p-1 transition-colors',
                checked ? 'bg-blue-500/20' : 'bg-slate-500/15',
                className,
            )}
        >
            <span
                className={cn(
                    'inline-block h-6 w-6 rounded-full bg-white shadow-md transition-transform dark:bg-slate-100',
                    checked ? 'translate-x-6' : 'translate-x-0',
                )}
            />
        </button>
    );
}

export function SearchField({
                                className,
                                inputClassName,
                                iconClassName,
                                ...props
                            }: InputProps & { inputClassName?: string; iconClassName?: string }) {
    return (
        <div className={cn('relative', className)}>
            <Search size={18}
                    className={cn('pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400', iconClassName)}/>
            <Input {...props} className={cn('pl-11', inputClassName)}/>
        </div>
    );
}

export function StateCard({
                              title,
                              description,
                              icon,
                              action,
                              className,
                          }: {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('glass-state rounded-[2rem] p-8 text-center', className)}>
            {icon && <div
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-300">{icon}</div>}
            <h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3>
            {description && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export function Tabs({
                         tabs,
                         value,
                         onValueChange,
                         className,
                     }: {
    tabs: Array<{ value: string; label: React.ReactNode; disabled?: boolean }>;
    value: string;
    onValueChange: (value: string) => void;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-wrap gap-2', className)} role="tablist" aria-orientation="horizontal">
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    type="button"
                    role="tab"
                    aria-selected={value === tab.value}
                    disabled={tab.disabled}
                    data-active={value === tab.value}
                    onClick={() => onValueChange(tab.value)}
                    className="glass-tab rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 transition-all hover:-translate-y-px hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:text-white"
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
