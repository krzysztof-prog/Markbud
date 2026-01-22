/**
 * Types for Attendance (BZ) module
 * Moduł BZ - widok miesięczny obecności pracowników
 */

export type AttendanceType = 'work' | 'sick' | 'vacation' | 'absent' | null;

export interface DayAttendance {
  type: AttendanceType;
  hours?: number;
  entryId?: number;
}

export interface WorkerSummary {
  totalHours: number;
  workDays: number;
  sickDays: number;
  vacationDays: number;
  absentDays: number;
}

export interface WorkerAttendance {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  days: Record<string, DayAttendance | null>;
  summary: WorkerSummary;
}

export interface MonthInfo {
  year: number;
  month: number;
  daysInMonth: number;
  weekends: number[];
}

export interface MonthlyAttendanceResponse {
  workers: WorkerAttendance[];
  month: MonthInfo;
  isEditable: boolean;
}

export interface UpdateDayRequest {
  workerId: number;
  date: string;
  type: 'work' | 'sick' | 'vacation' | 'absent' | 'clear';
}

// Mapowanie typów na wyświetlane wartości
export const ATTENDANCE_DISPLAY_MAP: Record<string, string> = {
  work: '8',
  sick: 'CH',
  vacation: 'UW',
  absent: 'N',
};

// Mapowanie wyświetlanych wartości na typy
export const DISPLAY_TO_TYPE_MAP: Record<string, AttendanceType | 'clear'> = {
  '8': 'work',
  'CH': 'sick',
  'UW': 'vacation',
  'N': 'absent',
  '-': 'clear',
};

// Kolory dla różnych typów
export const ATTENDANCE_COLORS: Record<string, string> = {
  work: 'text-green-700 bg-green-50',
  sick: 'text-red-700 bg-red-50',
  vacation: 'text-blue-700 bg-blue-50',
  absent: 'text-orange-700 bg-orange-50',
};
