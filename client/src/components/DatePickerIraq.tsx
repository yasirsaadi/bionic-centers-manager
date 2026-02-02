import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePickerIraqProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "data-testid"?: string;
}

const months = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const daysOfWeek = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export function DatePickerIraq({ value, onChange, className, "data-testid": testId }: DatePickerIraqProps) {
  const [open, setOpen] = useState(false);
  
  const selectedDate = value ? new Date(value) : new Date();
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  
  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return "اختر التاريخ";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };
  
  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    onChange(`${year}-${month}-${dayStr}`);
    setOpen(false);
  };
  
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };
  
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const days = [];
  
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  
  const isSelected = (day: number) => {
    if (!value || !day) return false;
    const d = new Date(value);
    return d.getDate() === day && d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  };
  
  const isToday = (day: number) => {
    if (!day) return false;
    const today = new Date();
    return today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-right font-normal gap-2",
            !value && "text-muted-foreground",
            className
          )}
          data-testid={testId}
        >
          <Calendar className="h-4 w-4" />
          {formatDisplayDate(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-700" align="start">
        <div className="p-3" dir="rtl">
          {/* Year selector */}
          <div className="flex items-center justify-center gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">
            <Button variant="outline" size="sm" onClick={() => setViewYear(viewYear - 1)} className="h-7 px-2" data-testid="btn-prev-year">
              <span className="text-xs">« السنة السابقة</span>
            </Button>
            <span className="font-bold text-primary px-3">{viewYear}</span>
            <Button variant="outline" size="sm" onClick={() => setViewYear(viewYear + 1)} className="h-7 px-2" data-testid="btn-next-year">
              <span className="text-xs">السنة التالية »</span>
            </Button>
          </div>
          
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" onClick={handleNextMonth} data-testid="btn-next-month">
              <span className="text-lg">›</span>
            </Button>
            <div className="font-medium">
              {months[viewMonth]} {viewYear}
            </div>
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} data-testid="btn-prev-month">
              <span className="text-lg">‹</span>
            </Button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map((day) => (
              <div key={day} className="text-center text-xs text-muted-foreground py-1">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => (
              <div key={index} className="text-center">
                {day ? (
                  <Button
                    variant={isSelected(day) ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 font-normal",
                      isToday(day) && !isSelected(day) && "border border-primary",
                      isSelected(day) && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => handleDateSelect(day)}
                    data-testid={`day-${day}`}
                  >
                    {day}
                  </Button>
                ) : (
                  <div className="h-8 w-8" />
                )}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
