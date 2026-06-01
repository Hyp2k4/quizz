import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { DEFAULT_OPEN_GRADING_CONFIG, OpenGradingConfig } from "@/utils/openGrading";

const OPEN_GRADING_DOC_PATH = { col: "system_config", doc: "open_grading" } as const;

let cached: { value: OpenGradingConfig; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000;

export async function getOpenGradingConfig(): Promise<OpenGradingConfig> {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) return cached.value;

  try {
    const ref = doc(db, OPEN_GRADING_DOC_PATH.col, OPEN_GRADING_DOC_PATH.doc);
    const snap = await getDoc(ref);
    const cfg = snap.exists()
      ? ({ ...DEFAULT_OPEN_GRADING_CONFIG, ...(snap.data() as Partial<OpenGradingConfig>) } as OpenGradingConfig)
      : DEFAULT_OPEN_GRADING_CONFIG;
    cached = { value: cfg, fetchedAt: now };
    return cfg;
  } catch (e) {
    // If permissions deny or config doesn't exist, fall back to defaults.
    return DEFAULT_OPEN_GRADING_CONFIG;
  }
}

export function clearOpenGradingConfigCache() {
  cached = null;
}

