'use client';

import * as React from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  keywords?: string[];
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  triggerStyle?: React.CSSProperties;
  size?: 'sm' | 'md' | 'lg';
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Pilih item...',
  searchPlaceholder = 'Ketik untuk mencari...',
  emptyMessage = 'Tidak ada pilihan ditemukan.',
  disabled = false,
  clearable = false,
  className,
  style,
  triggerStyle,
  size = 'md',
}: ComboboxProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [dropdownPosition, setDropdownPosition] = React.useState<'bottom' | 'top'>('bottom');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Selected Option
  const selectedOption = React.useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  // Filtered Options
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(term);
      const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(term) : false;
      const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(term) : false;
      const matchKeywords = opt.keywords ? opt.keywords.some((k) => k.toLowerCase().includes(term)) : false;
      return matchLabel || matchSub || matchBadge || matchKeywords;
    });
  }, [options, searchTerm]);

  // Position detection (top or bottom)
  const updatePosition = React.useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownHeight = 260; // Estimated max height
    if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
      setDropdownPosition('top');
    } else {
      setDropdownPosition('bottom');
    }
  }, []);

  // Open & Focus
  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
      setSearchTerm('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setIsOpen(false);
    }
  };

  // Close when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  // Size configurations
  const heightStyle = size === 'sm' ? '32px' : size === 'lg' ? '40px' : '36px';
  const fontSizeStyle = size === 'sm' ? '12px' : '13px';

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', className)}
      style={{ ...style, position: 'relative' }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        style={{
          width: '100%',
          height: heightStyle,
          background: disabled ? '#f4f4f5' : '#ffffff',
          borderRadius: '8px',
          border: isOpen ? '1.5px solid #57695b' : '1px solid #d1d5db',
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          fontSize: fontSizeStyle,
          color: selectedOption ? '#1c2826' : '#9ca3af',
          fontWeight: selectedOption ? 600 : 400,
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(87, 105, 91, 0.15)' : 'none',
          transition: 'all 0.15s ease',
          boxSizing: 'border-box',
          ...triggerStyle,
        }}
      >
        <span
          style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'left',
            flex: 1,
          }}
          title={selectedOption ? selectedOption.label : placeholder}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {clearable && selectedOption && !disabled && (
            <span
              onClick={handleClear}
              style={{
                color: '#9ca3af',
                cursor: 'pointer',
                display: 'inline-flex',
                padding: '2px',
                borderRadius: '4px',
              }}
              title="Hapus pilihan"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={14}
            color="#57695b"
            style={{
              transition: 'transform 0.2s ease',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            [dropdownPosition === 'top' ? 'bottom' : 'top']: 'calc(100% + 4px)',
            background: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e4dc',
            boxShadow: '0 10px 28px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.04)',
            zIndex: 9999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '280px',
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {/* Search Input Bar */}
          <div
            style={{
              padding: '8px 10px',
              borderBottom: '1px solid #f0f0eb',
              background: '#fcfcfb',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Search size={14} color="#71717a" style={{ flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    handleSelect(filteredOptions[0].value);
                  }
                }
              }}
              style={{
                width: '100%',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '12px',
                color: '#1c2826',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#a1a1aa',
                  padding: '2px',
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              padding: '4px',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  textAlign: 'center',
                  color: '#71717a',
                  fontSize: '12px',
                }}
              >
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      fontSize: '12px',
                      background: isSelected ? '#f2f4ef' : 'transparent',
                      color: isSelected ? '#2d6a4f' : '#1c2826',
                      fontWeight: isSelected ? 700 : 500,
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f7f7f5';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {opt.label}
                        </span>
                        {opt.badge && (
                          <span
                            style={{
                              fontSize: '9.5px',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: '#edf3ee',
                              color: '#2d6a4f',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.subLabel && (
                        <span style={{ fontSize: '11px', color: '#71717a', marginTop: '1px' }}>
                          {opt.subLabel}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check size={14} color="#2d6a4f" style={{ flexShrink: 0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
