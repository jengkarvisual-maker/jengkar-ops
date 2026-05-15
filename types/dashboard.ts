import type { AddonType, AttendanceStatus, StopCardStatus, UserRole } from "@prisma/client";

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
  detail: string | null;
  userId: string;
  name: string;
  targetSelesai: Date | null;
  tanggalMulai: Date | null;
  tanggalSelesai: Date | null;
  tanggalRevisi: Date | null;
  revisiDone: Date | null;
  closing: boolean;
  isDone: boolean;
  canceledAt: Date | null;
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

export type LockedKpiMonthItem = {
  key: string;
  label: string;
  lockedAt: Date;
  lockedByName: string;
};

export type OwnerStopCardItem = {
  id: string;
  title: string;
  content: string;
  status: StopCardStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type EmployeeStopCardItem = {
  id: string;
  title: string;
  content: string;
  status: StopCardStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type DashboardUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type DashboardMonthOption = {
  key: string;
  label: string;
  year: number;
  month: number;
};

export type LockedKpiSelection = {
  key: string;
  label: string;
  lockedAt: Date;
  lockedByName: string;
};

export type BonusSimulationItem = {
  userId: string;
  name: string;
  averageScore: number;
  monthsCount: number;
  bonus: number;
};

export type OvertimeItem = {
  attendanceId: string;
  userId: string;
  name: string;
  email: string;
  date: Date;
  checkOut: Date;
  overtimeHours: number;
  monthTotalHours: number;
};

export type EmployeeAddonItem = {
  id: string;
  userId: string;
  name: string;
  email: string;
  addonDate: Date;
  addonType: AddonType;
  addonTypeLabel: string;
  addonQuantity: number;
  monthTotalQuantity: number;
  createdAt: Date;
  updatedAt: Date;
};

export type OwnerDashboardData = {
  teamSize: number;
  teamUsers: DashboardUser[];
  monthlyKpiPeriodLabel: string;
  monthlyKpiIsFinal: boolean;
  lockedKpiMonthOptions: DashboardMonthOption[];
  selectedLockedKpiMonth: LockedKpiSelection | null;
  selectedLockedMonthlyKpis: MonthlyKpiItem[];
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
  lockedKpiMonths: LockedKpiMonthItem[];
  stopCards: OwnerStopCardItem[];
  bonusPreview: BonusPreviewItem[];
  simulationMonthOptions: DashboardMonthOption[];
  simulationStartMonthKey: string;
  simulationEndMonthKey: string;
  simulationAmount: number;
  simulationIsFullyLocked: boolean;
  simulationPeriodLabel: string;
  simulationRows: BonusSimulationItem[];
  activeFinanceYear: number;
  monitoringMonthOptions: DashboardMonthOption[];
  selectedMonitoringMonthKey: string;
  selectedMonitoringMonthLabel: string;
  selectedMonitoringUserId: string;
  selectedMonitoringUserName: string | null;
  overtimeRows: OvertimeItem[];
  overtimeMonthlyTotalHours: number;
  addonRows: EmployeeAddonItem[];
  addonMonthlyTotalQuantity: number;
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
  stopCards: EmployeeStopCardItem[];
  narrative: string;
  scheduleLabel: string;
  overtimeRows: OvertimeItem[];
  overtimeMonthLabel: string;
  overtimeMonthlyTotalHours: number;
  addonRows: EmployeeAddonItem[];
  addonMonthLabel: string;
  addonMonthlyTotalQuantity: number;
};
