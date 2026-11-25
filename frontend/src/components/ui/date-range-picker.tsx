'use client';

import * as React from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

export interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  onApply?: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
}

const monthNames = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const weekDayNames = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function formatDateToYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  const yy = y.slice(-2);
  return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${yy}`;
}

interface CalendarMonthGrid {
  year: number;
  month: number;
  monthName: string;
  days: Array<{
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
  }>;
}

function buildMonthGrid(year: number, month: number): CalendarMonthGrid {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = monthNames[month];

  // Monday start: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  const startDayOfWeek = (firstDay.getDay() + 6) % 7;

  const days: Array<{ dateStr: string; dayNumber: number; isCurrentMonth: boolean }> = [];

  // Previous month trailing days
  const prevMonthLastDate = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDate - i;
    const prevDate = new Date(year, month - 1, dayNum);
    days.push({
      dateStr: formatDateToYMD(prevDate),
      dayNumber: dayNum,
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const currDate = new Date(year, month, d);
    days.push({
      dateStr: formatDateToYMD(currDate),
      dayNumber: d,
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete grid (multiples of 7, at least 35 days)
  const remainder = days.length % 7;
  const remainingInWeek = remainder === 0 ? 0 : 7 - remainder;
  const targetTotal = days.length + remainingInWeek < 35 ? 35 : days.length + remainingInWeek;
  const nextMonthCount = targetTotal - days.length;

  for (let d = 1; d <= nextMonthCount; d++) {
    const nextDate = new Date(year, month + 1, d);
    days.push({
      dateStr: formatDateToYMD(nextDate),
      dayNumber: d,
      isCurrentMonth: false,
    });
  }

  return { year, month, monthName, days };
}

export function DateRangePicker({
  value = { from: '', to: '' },
  onChange,
  onApply,
  placeholder = 'Pilih rentang tanggal...',
  className = '',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Parse initial view month from value.from or current date
  const parseInitialDate = () => {
    if (value.from) {
      const parts = value.from.split('-');
      if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
      }
    }
    return new Date();
  };

  const initialDate = parseInitialDate();
  const [viewYear, setViewYear] = React.useState(() => initialDate.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(() => initialDate.getMonth());

  // Interactive selection state
  const [tempFrom, setTempFrom] = React.useState<string>(value.from || '');
  const [tempTo, setTempTo] = React.useState<string>(value.to || '');
  const [isSelecting, setIsSelecting] = React.useState(false);
  const [hoverDate, setHoverDate] = React.useState<string | null>(null);

  // Synchronize when value changes externally
  React.useEffect(() => {
    setTempFrom(value.from || '');
    setTempTo(value.to || '');
  }, [value.from, value.to]);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsSelecting(false);
        setHoverDate(null);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Dual Month Calculation (Left and Right months)
  const leftYear = viewYear;
  const leftMonth = viewMonth;

  let rightYear = viewYear;
  let rightMonth = viewMonth + 1;
  if (rightMonth > 11) {
    rightMonth = 0;
    rightYear += 1;
  }

  const leftGrid = React.useMemo(() => buildMonthGrid(leftYear, leftMonth), [leftYear, leftMonth]);
  const rightGrid = React.useMemo(() => buildMonthGrid(rightYear, rightMonth), [rightYear, rightMonth]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Day Click Handler
  const handleDayClick = (dateStr: string) => {
    if (!isSelecting) {
      // Step 1: Start selection
      setTempFrom(dateStr);
      setTempTo('');
      setIsSelecting(true);
      setHoverDate(null);
    } else {
      // Step 2: Complete range selection
      let from = tempFrom;
      let to = dateStr;
      if (to < from) {
        from = dateStr;
        to = tempFrom;
      }
      setTempFrom(from);
      setTempTo(to);
      setIsSelecting(false);
      setHoverDate(null);
      onChange({ from, to });
    }
  };

  // Commit and Apply Filter
  const handleApply = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const finalFrom = tempFrom;
    const finalTo = tempTo || tempFrom;
    onChange({ from: finalFrom, to: finalTo });
    if (onApply) {
      onApply({ from: finalFrom, to: finalTo });
    }
    setIsSelecting(false);
    setHoverDate(null);
    setIsOpen(false);
  };

  // Clear Filter
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempFrom('');
    setTempTo('');
    setIsSelecting(false);
    setHoverDate(null);
    onChange({ from: '', to: '' });
    if (onApply) {
      onApply({ from: '', to: '' });
    }
  };

  // Compute active range bounds for styling
  let effectiveFrom = tempFrom;
  let effectiveTo = tempTo;

  if (isSelecting && tempFrom && hoverDate) {
    if (hoverDate < tempFrom) {
      effectiveFrom = hoverDate;
      effectiveTo = tempFrom;
    } else {
      effectiveFrom = tempFrom;
      effectiveTo = hoverDate;
    }
  }

  // Format display text in input (e.g. 14/12/26 - 03/01/27)
  const renderDisplayText = () => {
    if (tempFrom && tempTo && tempFrom !== tempTo) {
      return `${formatShortDate(tempFrom)} - ${formatShortDate(tempTo)}`;
    }
    if (tempFrom) {
      return formatShortDate(tempFrom);
    }
    return placeholder;
  };

  const hasValue = Boolean(tempFrom);

  const renderMonthSection = (grid: CalendarMonthGrid, isLeft: boolean) => (
    <div style={{ width: '252px' }}>
      {/* Month Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          height: '28px',
        }}
      >
        {isLeft ? (
          <button
            type="button"
            onClick={handlePrevMonth}
            title="Bulan sebelumnya"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              padding: '4px',
              cursor: 'pointer',
              color: '#57695b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f3ee')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ChevronLeft size={16} />
          </button>
        ) : (
          <div style={{ width: '24px' }} />
        )}

        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1c2826' }}>
          {grid.monthName} {grid.year}
        </div>

        {!isLeft ? (
          <button
            type="button"
            onClick={handleNextMonth}
            title="Bulan berikutnya"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              padding: '4px',
              cursor: 'pointer',
              color: '#57695b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f3ee')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ChevronRight size={16} />
          </button>
        ) : (
          <div style={{ width: '24px' }} />
        )}
      </div>

      {/* Week Day Labels (Sen, Sel, Rab, Kam, Jum, Sab, Min) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 36px)',
          marginBottom: '6px',
        }}
      >
        {weekDayNames.map((day) => (
          <div
            key={day}
            style={{
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 600,
              color: '#64746b',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 36px)',
          rowGap: '2px',
        }}
      >
        {grid.days.map((item, idx) => {
          const isStart = effectiveFrom && item.dateStr === effectiveFrom;
          const isEnd = effectiveTo && item.dateStr === effectiveTo;
          const isInRange =
            effectiveFrom &&
            effectiveTo &&
            item.dateStr > effectiveFrom &&
            item.dateStr < effectiveTo;

          const isMon = idx % 7 === 0;
          const isSun = idx % 7 === 6;

          return (
            <div
              key={`${grid.year}-${grid.month}-${idx}-${item.dateStr}`}
              style={{
                position: 'relative',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={() => {
                if (isSelecting) setHoverDate(item.dateStr);
              }}
            >
              {/* Range connecting background strip (Theme: Ruang Temu Sage Tint #f0f3ee) */}
              {isInRange && (
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    bottom: '2px',
                    left: 0,
                    right: 0,
                    background: '#f0f3ee',
                    borderTopLeftRadius: isMon ? '8px' : 0,
                    borderBottomLeftRadius: isMon ? '8px' : 0,
                    borderTopRightRadius: isSun ? '8px' : 0,
                    borderBottomRightRadius: isSun ? '8px' : 0,
                    zIndex: 1,
                  }}
                />
              )}
              {isStart && effectiveTo && (
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    bottom: '2px',
                    left: '50%',
                    right: 0,
                    background: '#f0f3ee',
                    borderTopRightRadius: isSun ? '8px' : 0,
                    borderBottomRightRadius: isSun ? '8px' : 0,
                    zIndex: 1,
                  }}
                />
              )}
              {isEnd && effectiveFrom && (
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    bottom: '2px',
                    left: 0,
                    right: '50%',
                    background: '#f0f3ee',
                    borderTopLeftRadius: isMon ? '8px' : 0,
                    borderBottomLeftRadius: isMon ? '8px' : 0,
                    zIndex: 1,
                  }}
                />
              )}

              {/* Day Button (Squircle / Rounded Pill with Ruang Temu Green #57695b) */}
              <button
                type="button"
                onClick={() => handleDayClick(item.dateStr)}
                style={{
                  position: 'relative',
                  zIndex: 2,
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isStart || isEnd ? '#57695b' : 'transparent',
                  color:
                    isStart || isEnd
                      ? '#ffffff'
                      : item.isCurrentMonth
                      ? '#1c2826'
                      : '#8b968f',
                  fontSize: '13px',
                  fontWeight: isStart || isEnd ? 700 : item.isCurrentMonth ? 500 : 400,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.12s, transform 0.05s',
                  boxShadow: isStart || isEnd ? '0 2px 4px rgba(87, 105, 91, 0.3)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isStart && !isEnd) {
                    e.currentTarget.style.background = isInRange ? '#dfe5dc' : '#f2f4ef';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isStart && !isEnd) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {item.dayNumber}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* 1. Date Range Input Trigger (Theme: Ruang Temu Sage Palette) */}
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          height: '38px',
          padding: '0 12px',
          background: '#ffffff',
          border: '1px solid #e2e4dc',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 500,
          color: hasValue ? '#1c2826' : '#71717a',
          cursor: 'pointer',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          minWidth: '190px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#57695b';
          e.currentTarget.style.background = '#fafbf9';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#e2e4dc';
          e.currentTarget.style.background = '#ffffff';
        }}
      >
        <CalendarIcon size={16} color="#57695b" />
        <span style={{ fontWeight: hasValue ? 700 : 500, flex: 1, letterSpacing: '0.2px' }}>
          {renderDisplayText()}
        </span>
        {hasValue && (
          <span
            onClick={handleClear}
            title="Hapus filter tanggal"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#f2f4ef',
              color: '#57695b',
              cursor: 'pointer',
              marginLeft: '4px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#dfe5dc')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#f2f4ef')}
          >
            <X size={11} />
          </span>
        )}
      </div>

      {/* 2. Terapkan Filter Button (Theme: Signature Forest Green #57695b) */}
      <button
        type="button"
        onClick={() => handleApply()}
        style={{
          height: '38px',
          padding: '0 16px',
          background: '#57695b',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '12.5px',
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(87, 105, 91, 0.25)',
          transition: 'background 0.15s ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#46554a')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#57695b')}
      >
        Terapkan Filter
      </button>

      {/* 3. Popover: Dual Month Side-by-Side Calendar (Harmonized Ruang Temu Theme) */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 99999,
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e4dc',
            boxShadow: '0 12px 30px -4px rgba(87, 105, 91, 0.15), 0 8px 12px -6px rgba(0, 0, 0, 0.05)',
            padding: '20px 24px',
            animation: 'fadeIn 0.15s ease-out',
            userSelect: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Dual Calendar Container */}
          <div style={{ display: 'flex', gap: '32px' }}>
            {renderMonthSection(leftGrid, true)}
            {renderMonthSection(rightGrid, false)}
          </div>
        </div>
      )}
    </div>
  );
}
