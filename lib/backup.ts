import { z } from "zod";
import { workoutInputSchema } from "@/lib/schema";
import type { Workout } from "@/types/workout";

// 추가 기능 — 기록 백업. 브라우저에만 저장되는 기록을 파일(JSON)로 내보내고 다시 가져온다.
// 가져오는 파일은 믿지 않고 항목마다 다시 검사한다. 모양이 틀린 기록은 건너뛰고, 알 수 없는 항목은 버린다.

export const BACKUP_APP = "workout-coach";
export const BACKUP_VERSION = 1;
/** 가져올 파일의 최대 크기(바이트)와 기록 수. 너무 큰 파일로 브라우저가 멈추지 않게 한다. */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const MAX_BACKUP_RECORDS = 2000;

const coachSchema = z.object({
  feedback: z.string().min(1).max(5000),
  plan: z.object({
    sport: z.string().min(1).max(100),
    minutes: z.number().int().min(1).max(1440),
    intensity: workoutInputSchema.shape.intensity,
  }),
  notices: z.array(z.string().max(500)).max(20),
});

const backupRecordSchema = z.object({
  id: z.string().min(1).max(100),
  date: z.string().refine((value) => !Number.isNaN(new Date(value).getTime())),
  minutes: workoutInputSchema.shape.minutes,
  sport: workoutInputSchema.shape.sport,
  intensity: workoutInputSchema.shape.intensity,
  condition: workoutInputSchema.shape.condition,
  pain: z.boolean(),
  coach: coachSchema.optional(),
  helpful: z.boolean().optional(),
});

/** 기록 목록을 백업 파일 내용(JSON 글자)으로 만든다. */
export function createBackup(records: Workout[], now: Date = new Date()): string {
  return JSON.stringify(
    { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), records },
    null,
    2,
  );
}

export type ParsedBackup =
  | { ok: true; records: Workout[]; skipped: number }
  | { ok: false; message: string };

/** 백업 파일 내용을 읽어 검사를 통과한 기록만 돌려준다. */
export function parseBackup(text: string): ParsedBackup {
  if (text.length > MAX_BACKUP_BYTES) {
    return { ok: false, message: "파일이 너무 커요. (최대 5MB)" };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, message: "백업 파일 형식이 올바르지 않아요." };
  }
  const file = json as { app?: unknown; version?: unknown; records?: unknown };
  if (
    typeof json !== "object" ||
    json === null ||
    file.app !== BACKUP_APP ||
    file.version !== BACKUP_VERSION ||
    !Array.isArray(file.records)
  ) {
    return { ok: false, message: "이 앱에서 내보낸 백업 파일이 아니에요." };
  }
  if (file.records.length > MAX_BACKUP_RECORDS) {
    return { ok: false, message: `기록이 너무 많아요. (최대 ${MAX_BACKUP_RECORDS}건)` };
  }

  const records: Workout[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const item of file.records) {
    const parsed = backupRecordSchema.safeParse(item);
    if (!parsed.success || seen.has(parsed.data.id)) {
      skipped++;
      continue;
    }
    seen.add(parsed.data.id);
    records.push(parsed.data);
  }
  return { ok: true, records, skipped };
}
