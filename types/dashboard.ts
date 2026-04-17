import type { AttendanceStatus, UserRole } from "@prisma/client";

export type AttendanceItem = {
  id: string;
  userId: string;
  name: string;
  email: string;
  date: Date;
  status: AttendanceStatus;
  checkIn: Date | null;
  checkOut: Date | null;
};

export type ProgressItem = {
  id: string;
  pekerjaan: string;
  userId: string;
  name: string;
  targetSelesai: Date | null;
  tanggalMulai: Date | null;
  tanggalSelesai: Date | null;
  tanggalRevisi: Date | null;
  revisiDone: Date | null;
  closing: boolean;
  isDone: boolean;
  createdAt: Date;
};

export type MonthlyKpiItem = {
  id: string;
  userId: string;
  name: string;
  month: number;
  year: number;
  scoreKinerja: number;
  scoreDisiplin: number;
  totalScore: number;
};

export type YearlyKpiItem = {
  id: string;
  userId: string;
  name: string;
  year: number;
  avgScore: number;
};

export type BonusPreviewItem = {
  userId: string;
  name: string;
  avgScore: number;
  bonus: number;
};

export type DashboardUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type OwnerDashboardData = {
  teamSize: number;
  teamUsers: DashboardUser[];
  attendanceToday: AttendanceItem[];
  attendanceSummary: {
    onTime: number;
    late: number;
    off: number;
  };
  recentProgress: ProgressItem[];
  completedProgressRows: ProgressItem[];
  completedProgressCount: number;
  openProgressCount: number;
  monthlyKpis: MonthlyKpiItem[];
  yearlyKpis: YearlyKpiItem[];
  bonusPreview: BonusPreviewItem[];
  activeFinanceYear: number;
  finance:
    | {
        year: number;
        netProfit: number;
        bonusPool: number;
      }
    | null;
};

export type AdminDashboardData = {
  teamUsers: DashboardUser[];
  attendanceSummary: {
    onTime: number;
    late: number;
    off: number;
  };
  progressRows: ProgressItem[];
  completedProgressRows: ProgressItem[];
  openProgressCount: number;
  completedProgressCount: number;
  monthlyKpis: MonthlyKpiItem[];
};

export type EmployeeDashboardData = {
  attendanceToday: AttendanceItem | null;
  recentAttendance: AttendanceItem[];
  progressRows: ProgressItem[];
  monthlyKpi: MonthlyKpiItem | null;
  yearlyKpi: YearlyKpiItem | null;
  narrative: string;
  scheduleLabel: string;
};
