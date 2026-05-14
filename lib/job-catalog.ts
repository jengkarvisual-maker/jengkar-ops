export type JobGroup = "A" | "B" | "C" | "D" | "E";

export type JobOption = {
  name: string;
  group: JobGroup;
  weight: number;
};

export const JOB_OPTIONS = [
  { name: "Content Plan", group: "A", weight: 5 },
  { name: "Dealing Client", group: "A", weight: 5 },
  { name: "Produksi Wedding", group: "B", weight: 4 },
  { name: "Produksi Konten", group: "C", weight: 3 },
  { name: "Makeup Wedding", group: "B", weight: 4 },
  { name: "Luar Kota", group: "B", weight: 4 },
  { name: "Makeup Prewedding", group: "C", weight: 3 },
  { name: "Makeup Lain", group: "C", weight: 3 },
  { name: "Motret Studio", group: "D", weight: 2 },
  { name: "Edit Design Konten", group: "D", weight: 2 },
  { name: "Edit Video Wedding", group: "D", weight: 2 },
  { name: "Edit Foto Wedding", group: "D", weight: 2 },
  { name: "Edit Konten (Foto&Video)", group: "D", weight: 2 },
  { name: "Edit Foto Studio", group: "D", weight: 2 },
  { name: "Admin Jengkar", group: "D", weight: 2 },
  { name: "Admin All Brand", group: "D", weight: 2 },
  { name: "Portfolio (all in)", group: "E", weight: 1 },
  { name: "Meeting", group: "E", weight: 1 },
  { name: "Lain-lain", group: "E", weight: 1 },
] as const satisfies readonly JobOption[];

const JOB_ALIASES = new Map<string, JobOption>(
  [
    ["pembuatan content plan", JOB_OPTIONS[0]],
    ["edit konten (foto & video)", JOB_OPTIONS[12]],
    ["portfollio (all in)", JOB_OPTIONS[14]],
  ],
);

function normalizeJobName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getJobOption(jobName: string): JobOption | null {
  const normalized = normalizeJobName(jobName);
  const directMatch = JOB_OPTIONS.find((option) => normalizeJobName(option.name) === normalized);

  return directMatch ?? JOB_ALIASES.get(normalized) ?? null;
}

export function isKnownJobName(jobName: string) {
  return Boolean(getJobOption(jobName));
}

export function getJobWeight(jobName: string) {
  return getJobOption(jobName)?.weight ?? 1;
}

export function getJobGroupLabel(jobName: string) {
  const option = getJobOption(jobName);

  return option ? `Kelompok ${option.group}` : "Kelompok E";
}
