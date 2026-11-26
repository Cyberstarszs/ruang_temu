'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  fullWidth?: boolean;
  align?: 'left' | 'right';
  position?: 'bottom' | 'top' | 'auto';
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal...',
  fullWidth = false,
  align,
  position = 'auto',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = React.useState<'bottom' | 'top'>('bottom');
  const [computedAlign, setComputedAlign] = React.useState<'left' | 'right'>('left');

  React.useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const windowWidth = window.innerWidth;

      if (position === 'top') {
        setPlacement('top');
      } else if (position === 'bottom') {
        setPlacement('bottom');
      } else {
        const spaceBelow = windowHeight - rect.bottom;
        const spaceAbove = rect.top;
        if (spaceBelow < 310 && spaceAbove > 200) {
          setPlacement('top');
        } else {
          setPlacement('bottom');
        }
      }

      if (align) {
        setComputedAlign(align);
      } else {
        if (rect.left + 265 > windowWidth) {
          setComputedAlign('right');
        } else {
          setComputedAlign('left');
        }
      }
    }
  }, [isOpen, position, align]);

  // Parse initial view month/year
  const selectedDate = value ? new Date(value + 'T00:00:00') : null;
  const [viewYear, setViewYear] = React.useState(() => (selectedDate ? selectedDate.getFullYear() : new Date().getFullYear()));
  const [viewMonth, setViewMonth] = React.useState(() => (selectedDate ? selectedDate.getMonth() : new Date().getMonth()));

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((v) => v - 1);
    } else {
      setViewMonth((v) => v - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((v) => v + 1);
    } else {
      setViewMonth((v) => v + 1);
    }
  };

  // Generate calendar grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sun

  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getFullYear() === viewYear
    );
  };

  const selectDay = (day: number) => {
    const y = viewYear;
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const setToday = () => {
    const t = new Date();
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const setYesterday = () => {
    const t = new Date();
    t.setDate(t.getDate() - 1);
    setViewYear(t.getFullYear());
    setViewMonth(t.getMonth());
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  // Format display text
  const displayText = selectedDate
    ? selectedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : placeholder;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: fullWidth ? 'block' : 'inline-block',
        width: fullWidth ? '100%' : 'auto',
      }}
    >
      {/* Trigger Button (Shadcn UI style) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: fullWidth ? 'space-between' : 'flex-start',
          gap: '8px',
          width: fullWidth ? '100%' : 'auto',
          height: '36px',
          padding: '0 10px',
          background: '#ffffff',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '12.5px',
          fontWeight: 500,
          color: value ? '#1c2826' : '#71717a',
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#57695b';
          e.currentTarget.style.background = '#fafbf9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#d1d5db';
          e.currentTarget.style.background = '#ffffff';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <CalendarIcon size={14} color="#57695b" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: value ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayText}
          </span>
        </div>
        {value && (
          <span
            onClick={clearDate}
            title="Hapus filter tanggal"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#f0f0eb',
              color: '#71717a',
              cursor: 'pointer',
              marginLeft: '2px',
              flexShrink: 0,
            }}
          >
            <X size={10} />
          </span>
        )}
      </button>

      {/* Popover Calendar (Shadcn UI Popover / Calendar style) */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            ...(placement === 'top'
              ? { bottom: 'calc(100% + 6px)', top: 'auto' }
              : { top: 'calc(100% + 6px)', bottom: 'auto' }),
            ...(computedAlign === 'right'
              ? { right: 0, left: 'auto' }
              : { left: 0, right: 'auto' }),
            zIndex: 99999,
            width: '260px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e4dc',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            padding: '12px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Calendar Header with Month/Year and Navigation */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <button
              type="button"
              onClick={handlePrevMonth}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#4b5563',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
            >
              <ChevronLeft size={14} />
            </button>

            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1c2826' }}>
              {monthNames[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#4b5563',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Day of Week Headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              fontSize: '11px',
              fontWeight: 600,
              color: '#9ca3af',
              marginBottom: '6px',
            }}
          >
            <span>Min</span>
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span>Sab</span>
          </div>

          {/* Days Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '2px',
              textAlign: 'center',
            }}
          >
            {/* Empty slots before day 1 */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} style={{ height: '30px' }} />
            ))}

            {/* Days in Month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const selected = isSelected(day);
              const currentDay = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  style={{
                    height: '30px',
                    width: '30px',
                    borderRadius: '6px',
                    border: 'none',
                    background: selected ? '#57695b' : 'transparent',
                    color: selected ? '#ffffff' : currentDay ? '#57695b' : '#1f2937',
                    fontWeight: selected || currentDay ? 700 : 500,
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    transition: 'all 0.1s ease',
                    boxShadow: selected ? '0 1px 3px rgba(87,105,91,0.4)' : currentDay ? 'inset 0 0 0 1px #57695b' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!selected) {
                      e.currentTarget.style.background = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selected) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Presets & Clear Footer */}
          <div
            style={{
              marginTop: '10px',
              paddingTop: '8px',
              borderTop: '1px solid #f0f0eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px',
            }}
          >
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={setToday}
                style={{
                  background: '#f4f5f1',
                  border: '1px solid #e1e4dc',
                  borderRadius: '5px',
                  padding: '2px 7px',
                  color: '#57695b',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={setYesterday}
                style={{
                  background: '#f4f5f1',
                  border: '1px solid #e1e4dc',
                  borderRadius: '5px',
                  padding: '2px 7px',
                  color: '#57695b',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Kemarin
              </button>
            </div>

            {value && (
              <button
                type="button"
                onClick={clearDate}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#dc2626',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
