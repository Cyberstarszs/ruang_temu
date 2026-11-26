'use client';

import * as React from 'react';

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | number | undefined | null;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (cleanValue: string) => void;
  allowDecimal?: boolean;
}

export function formatThousand(
  val: string | number | undefined | null,
  allowDecimal = false,
  isTyping = false
): string {
  if (val === undefined || val === null || val === '') return '';
  let str = String(val);

  if (!allowDecimal) {
    if (str.includes('.') || str.includes(',')) {
      const parts = str.replace(',', '.').split('.');
      const intDigits = parts[0].replace(/\D/g, '');
      return intDigits ? Number(intDigits).toLocaleString('id-ID') : '0';
    }
    const digits = str.replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('id-ID');
  }

  if (str.includes('.') || str.includes(',')) {
    const parts = str.replace(',', '.').split('.');
    const intPart = parts[0].replace(/\D/g, '');
    const formattedInt = intPart ? Number(intPart).toLocaleString('id-ID') : '0';

    if (parts.length > 1) {
      let decPart = parts[1];

      // If user typed comma/dot at the end (e.g. "12." or "12,")
      if (decPart === '') {
        return `${formattedInt},`;
      }

      // If actively typing, preserve what the user types (even if ending in zero like "12,0")
      if (isTyping) {
        return `${formattedInt},${decPart}`;
      }

      // Otherwise (initial value, blur, or DB float like "700.000", "12.500"):
      // Strip trailing zeros
      decPart = decPart.replace(/0+$/, '');
      if (!decPart) {
        return formattedInt;
      }
      return `${formattedInt},${decPart}`;
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
  ({ value, onChange, onValueChange, allowDecimal = false, onKeyDown, onFocus, onBlur, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement | null>(null);
    const cursorRef = React.useRef<{ digitsBefore: number } | null>(null);
    const [isFocused, setIsFocused] = React.useState(false);

    React.useImperativeHandle(ref, () => internalRef.current as HTMLInputElement);

    // Derived formatted display value
    const displayValue = React.useMemo(() => {
      return formatThousand(value, allowDecimal, isFocused);
    }, [value, allowDecimal, isFocused]);

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

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
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
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    );
  }
);

NumberInput.displayName = 'NumberInput';
