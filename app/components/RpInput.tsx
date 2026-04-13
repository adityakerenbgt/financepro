'use client';

interface RpInputProps {
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function RpInput({ value, onChange, placeholder = '0', required, disabled, className = '', autoFocus }: RpInputProps) {
  // Convert raw digit string → formatted display (e.g. "10000000" → "10.000.000")
  const display = value ? parseInt(value).toLocaleString('id-ID') : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip thousand separators (dots in id-ID) and any non-digit chars
    const raw = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
    onChange(raw);
  };

  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-300 font-medium pointer-events-none select-none z-10">
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        className="input-field w-full text-sm pl-10"
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    </div>
  );
}
