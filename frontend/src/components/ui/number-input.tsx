'use client';

import * as React from 'react';

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | number | undefined | null;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (cleanValue: string) => void;
  allowDecimal?: boolean;
}

export function formatThousand(val: string | number | undefined | null, allowDecimal = false): string {
  if (val === undefined || val === null || val === '') return '';
  let str = String(val);

  // Strip trailing unnecessary .00 or ,00 (e.g. "30000.00" -> "30000", "15.00" -> "15")
  str = str.replace(/[.,]00$/, '');

  if (allowDecimal && (str.includes('.') || str.includes(','))) {
    const parts = str.replace(',', '.').split('.');
    const intPart = parts[0].replace(/\D/g, '');
    const formattedInt = intPart ? Number(intPart).toLocaleString('id-ID') : '0';
    if (parts.length > 1 && parts[1] && parts[1] !== '00') {
      return `${formattedInt},${parts[1]}`;
    }
    return formattedInt;
  }
  const digits = str.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
}

export function cleanNumberString(val: string, allowDecimal = false): string {
  if (!val) return '';
  if (allowDecimal) {
    const normalized = val.replace(/\./g, '').replace(',', '.');
    const parts = normalized.split('.');
    if (parts.length > 1) {
      const intDigits = parts[0].replace(/\D/g, '');
      const decDigits = parts.slice(1).join('').replace(/\D/g, '');
      return `${intDigits}.${decDigits}`;
    }
    return normalized.replace(/\D/g, '');
  }
  return val.replace(/\D/g, '');
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, onValueChange, allowDecimal = false, onKeyDown, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement | null>(null);
    const cursorRef = React.useRef<{ digitsBefore: number } | null>(null);

    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    // Derived formatted display value
    const displayValue = React.useMemo(() => {
      return formatThousand(value, allowDecimal);
    }, [value, allowDecimal]);

    // Preserve cursor position after format
    React.useLayoutEffect(() => {
      if (internalRef.current && cursorRef.current !== null) {
        const { digitsBefore } = cursorRef.current;
        const val = internalRef.current.value;
        let count = 0;
        let newPos = val.length;
        if (digitsBefore === 0) {
          newPos = 0;
        } else {
          for (let i = 0; i < val.length; i++) {
            if (/\d/.test(val[i])) {
              count++;
              if (count === digitsBefore) {
                newPos = i + 1;
                break;
              }
            }
          }
        }
        internalRef.current.setSelectionRange(newPos, newPos);
        cursorRef.current = null;
      }
    }, [displayValue]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawInput = e.target.value;
      const cursorPos = e.target.selectionStart || 0;
      const beforeCursor = rawInput.slice(0, cursorPos);
      const digitsBefore = beforeCursor.replace(/\D/g, '').length;

      cursorRef.current = { digitsBefore };

      const clean = cleanNumberString(rawInput, allowDecimal);

      onValueChange?.(clean);

      if (onChange) {
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: clean,
            name: e.target.name,
          },
          currentTarget: {
            ...e.currentTarget,
            value: clean,
            name: e.currentTarget.name,
          },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Smart backspace over thousand separator dot
      if (e.key === 'Backspace') {
        const input = e.currentTarget;
        const { selectionStart, selectionEnd } = input;
        if (selectionStart === selectionEnd && selectionStart !== null && selectionStart > 1) {
          if (input.value[selectionStart - 1] === '.') {
            // If character right before cursor is a dot, remove the digit before the dot
            e.preventDefault();
            const before = input.value.slice(0, selectionStart - 2);
            const after = input.value.slice(selectionStart);
            const nextRaw = (before + after).replace(/\./g, '');
            const clean = cleanNumberString(nextRaw, allowDecimal);
            
            cursorRef.current = { digitsBefore: Math.max(0, selectionStart - 2) };
            onValueChange?.(clean);
            if (onChange) {
              const syntheticEvent = {
                ...e,
                target: {
                  ...input,
                  value: clean,
                  name: input.name,
                },
                currentTarget: {
                  ...input,
                  value: clean,
                  name: input.name,
                },
              } as unknown as React.ChangeEvent<HTMLInputElement>;
              onChange(syntheticEvent);
            }
            return;
          }
        }
      }
      onKeyDown?.(e);
    };

    return (
      <input
        {...props}
        ref={internalRef}
        type="text"
        inputMode={allowDecimal ? 'decimal' : 'numeric'}
        value={displayValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';
