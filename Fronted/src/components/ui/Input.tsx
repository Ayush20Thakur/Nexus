import { clsx } from 'clsx';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: string;
  rightElement?: ReactNode;
  variant?: 'default' | 'search';
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightElement,
  variant = 'default',
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label
          htmlFor={inputId}
          className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider ml-1"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <span className="material-symbols-outlined absolute left-4 text-on-surface-variant text-[18px] pointer-events-none">
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          className={clsx(
            'w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg',
            'py-3 outline-none border transition-all duration-200',
            'placeholder:text-on-surface-variant/50',
            leftIcon ? 'pl-11 pr-4' : 'px-4',
            rightElement ? 'pr-12' : '',
            error
              ? 'border-error-red/40 focus:ring-1 focus:ring-error-red/50'
              : 'border-outline-variant/20 focus:ring-1 focus:ring-primary/50 focus:border-primary/40',
            variant === 'search' && 'bg-surface-container-high border-outline-variant/20',
            className
          )}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 flex items-center">{rightElement}</div>
        )}
      </div>

      {error && (
        <p className="text-body-sm font-body-sm text-error-red flex items-center gap-1 ml-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-metadata font-metadata text-on-surface-variant ml-1">{hint}</p>
      )}
    </div>
  );
}

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
}

export function SearchBar({ value, onChange, placeholder = 'Search…', className, onClear }: SearchBarProps) {
  return (
    <div className={clsx('relative flex items-center', className)}>
      <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[18px] pointer-events-none">
        search
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-surface-container-high text-on-surface font-body-md text-body-md rounded-lg
          py-2.5 pl-10 pr-4 outline-none border border-outline-variant/20
          hover:border-outline/40 focus:border-primary/40 focus:ring-1 focus:ring-primary/30
          placeholder:text-on-surface-variant/60 transition-all duration-200"
      />
      {value && onClear && (
        <button
          onClick={onClear}
          className="absolute right-3 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      )}
    </div>
  );
}
