'use client';
import { useState, useRef, useEffect } from 'react';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m) { return new Date(y, m, 1).getDay(); }
function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function inRange(d, s, e) { return s && e && d > s && d < e; }
function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtLabel(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

function MonthGrid({ year, month, rangeStart, rangeEnd, hoverDate, onDayClick, onDayHover }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const prevDays = getDaysInMonth(year, month - 1);
  const cells = [];

  for (let i = firstDay - 1; i >= 0; i--)
    cells.push({ day: prevDays - i, cur: false, date: new Date(year, month - 1, prevDays - i) });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, cur: true, date: new Date(year, month, d) });
  const rem = (Math.ceil(cells.length / 7) * 7) - cells.length;
  for (let d = 1; d <= rem; d++)
    cells.push({ day: d, cur: false, date: new Date(year, month + 1, d) });

  const effEnd = rangeEnd || hoverDate;
  let rS = rangeStart, rE = effEnd;
  if (rS && rE && rS > rE) [rS, rE] = [rE, rS];

  return (
    <div className="w-[252px]">
      <div className="text-center text-sm font-semibold text-slate-900 dark:text-white mb-3">
        {MONTHS[month]} {year}
      </div>
      <div className="grid grid-cols-7">
        {DAYS.map(d => (
          <div key={d} className="h-8 flex items-center justify-center text-xs font-medium text-slate-400 dark:text-slate-500">{d}</div>
        ))}
        {cells.map((c, i) => {
          const isStart = rS && sameDay(c.date, rS);
          const isEnd = rE && sameDay(c.date, rE);
          const mid = inRange(c.date, rS, rE);

          let bg = '', txt = '';
          if (!c.cur) {
            txt = 'text-slate-300 dark:text-slate-600';
          } else if (isStart || isEnd) {
            bg = 'bg-slate-800 dark:bg-slate-100';
            txt = 'text-white dark:text-slate-900 font-semibold';
          } else if (mid) {
            txt = 'text-slate-900 dark:text-slate-100';
          } else {
            txt = 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';
          }

          let rowBg = '';
          if (c.cur && mid) rowBg = 'bg-slate-100 dark:bg-slate-800/60';
          if (c.cur && isStart && rE) rowBg += ' rounded-l-full bg-slate-100 dark:bg-slate-800/60';
          if (c.cur && isEnd && rS) rowBg += ' rounded-r-full bg-slate-100 dark:bg-slate-800/60';

          return (
            <div key={i} className={`flex items-center justify-center ${rowBg}`}
              onClick={() => c.cur && onDayClick(c.date)}
              onMouseEnter={() => c.cur && onDayHover(c.date)}>
              <div className={`h-9 w-9 flex items-center justify-center text-sm rounded-full cursor-pointer transition-colors ${bg} ${txt}`}>
                {c.day}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DateRangePicker({ dateFrom, dateTo, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    if (dateFrom) {
      const d = new Date(dateFrom + 'T00:00:00');
      setRangeStart(d);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    } else setRangeStart(null);
  }, [dateFrom]);

  useEffect(() => {
    if (dateTo) setRangeEnd(new Date(dateTo + 'T00:00:00'));
    else setRangeEnd(null);
  }, [dateTo]);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleDayClick = (date) => {
    if (!selecting) {
      setRangeStart(date);
      setRangeEnd(null);
      setSelecting(true);
    } else {
      let s = rangeStart, e = date;
      if (s > e) [s, e] = [e, s];
      setRangeStart(s);
      setRangeEnd(e);
      setSelecting(false);
      setHoverDate(null);
      onChange(toYMD(s), toYMD(e));
      setOpen(false);
    }
  };

  const handleDayHover = (date) => { if (selecting) setHoverDate(date); };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const rightMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const rightYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  const clear = (e) => {
    e.stopPropagation();
    setRangeStart(null);
    setRangeEnd(null);
    setSelecting(false);
    setHoverDate(null);
    onChange('', '');
    setOpen(false);
  };

  const hasRange = dateFrom && dateTo;
  const label = hasRange
    ? `${fmtLabel(new Date(dateFrom + 'T00:00:00'))} – ${fmtLabel(new Date(dateTo + 'T00:00:00'))}`
    : 'Select Date Range';

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${hasRange ? 'bg-teal-50 dark:bg-teal-900/20 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {label}
        {hasRange && (
          <span onClick={clear} className="ml-1 hover:text-red-500">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-5" style={{ left: 0, maxWidth: 'calc(100vw - 32px)' }}>
          <div className="flex items-center justify-between mb-1 px-1">
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex-1" />
            <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
          <div className="flex gap-8">
            <MonthGrid year={viewYear} month={viewMonth}
              rangeStart={rangeStart} rangeEnd={rangeEnd} hoverDate={hoverDate}
              onDayClick={handleDayClick} onDayHover={handleDayHover} />
            <MonthGrid year={rightYear} month={rightMonth}
              rangeStart={rangeStart} rangeEnd={rangeEnd} hoverDate={hoverDate}
              onDayClick={handleDayClick} onDayHover={handleDayHover} />
          </div>
        </div>
      )}
    </div>
  );
}
