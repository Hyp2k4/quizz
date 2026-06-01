export type OpenGradingMode = "strict" | "normal" | "lenient";

export interface OpenGradingConfig {
  mode: OpenGradingMode;
  /**
   * Consider correct if matchRatio >= threshold (0..1).
   * matchRatio is computed against model answer tokens.
   */
  matchRatioThreshold: number;
  /**
   * Enable Vietnamese diacritics-insensitive matching.
   * Example: "quy dong" ~ "quy đồng"
   */
  ignoreDiacritics: boolean;
  /**
   * Enable fuzzy token matching (edit distance) for longer tokens.
   */
  enableFuzzy: boolean;
  maxEditDistance: number; // 0..2 is typical
  minTokenLengthForFuzzy: number; // e.g. 5
  /**
   * Optional synonyms mapping. Keys and values should be normalized text
   * (lowercase, no punctuation). Values are canonical replacements.
   */
  synonyms?: Record<string, string>;
}

export interface OpenGradingResult {
  isCorrect: boolean;
  matchRatio: number; // 0..1
  matchedModelTokens: string[];
  missingModelTokens: string[];
  normalizedUser: string;
  normalizedModel: string;
}

export const DEFAULT_OPEN_GRADING_CONFIG: OpenGradingConfig = {
  mode: "normal",
  matchRatioThreshold: 0.5,
  ignoreDiacritics: true,
  enableFuzzy: true,
  maxEditDistance: 1,
  minTokenLengthForFuzzy: 5,
  synonyms: {},
};

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function stripHtml(input: string) {
  return (input || "").replace(/<[^>]*>/g, " ");
}

function removeDiacriticsVi(input: string) {
  // Normalize + strip combining marks; also handle đ/Đ.
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function normalizeText(input: string, cfg: OpenGradingConfig) {
  let s = stripHtml(input);
  s = s.replace(/&nbsp;/g, " ");
  if (cfg.ignoreDiacritics) s = removeDiacriticsVi(s);
  s = s.toLowerCase();
  // Replace punctuation with space
  s = s.replace(/[\.\,\!\?\;\:\(\)\[\]\{\}"'`~@#$%^&*_\-+=\\/|<>]/g, " ");
  // Collapse spaces
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function tokenize(normalized: string) {
  if (!normalized) return [];
  return normalized.split(" ").filter(Boolean);
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const dp = new Array(bl + 1);
  for (let j = 0; j <= bl; j++) dp[j] = j;

  for (let i = 1; i <= al; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= bl; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1, // delete
        dp[j - 1] + 1, // insert
        prev + cost // substitute
      );
      prev = tmp;
    }
  }
  return dp[bl];
}

function canonicalizeToken(token: string, cfg: OpenGradingConfig) {
  const syn = cfg.synonyms || {};
  return syn[token] || token;
}

function tokenMatches(userTok: string, modelTok: string, cfg: OpenGradingConfig) {
  if (userTok === modelTok) return true;
  if (!cfg.enableFuzzy) return false;
  if (userTok.length < cfg.minTokenLengthForFuzzy || modelTok.length < cfg.minTokenLengthForFuzzy) return false;
  return levenshtein(userTok, modelTok) <= cfg.maxEditDistance;
}

/**
 * Grades an open-ended answer by token overlap against model answer.
 * - matchRatio = matchedModelTokens / totalModelTokens (unique-ish via greedy match)
 * - isCorrect if matchRatio >= cfg.matchRatioThreshold
 */
export function gradeOpenAnswer(
  userAnswerRaw: string,
  modelAnswerRaw: string,
  cfgInput?: Partial<OpenGradingConfig>
): OpenGradingResult {
  const cfg: OpenGradingConfig = {
    ...DEFAULT_OPEN_GRADING_CONFIG,
    ...(cfgInput || {}),
  };

  // Mode presets (admin can still override explicit fields)
  if (cfg.mode === "strict") {
    cfg.matchRatioThreshold = cfgInput?.matchRatioThreshold ?? 0.8;
    cfg.maxEditDistance = cfgInput?.maxEditDistance ?? 0;
    cfg.enableFuzzy = cfgInput?.enableFuzzy ?? false;
  } else if (cfg.mode === "lenient") {
    cfg.matchRatioThreshold = cfgInput?.matchRatioThreshold ?? 0.4;
    cfg.maxEditDistance = cfgInput?.maxEditDistance ?? 1;
    cfg.enableFuzzy = cfgInput?.enableFuzzy ?? true;
  } else {
    // normal
    cfg.matchRatioThreshold = cfgInput?.matchRatioThreshold ?? 0.5;
  }

  const normalizedUser = normalizeText(userAnswerRaw || "", cfg);
  const normalizedModel = normalizeText(modelAnswerRaw || "", cfg);

  const userTokensRaw = tokenize(normalizedUser).map((t) => canonicalizeToken(t, cfg));
  const modelTokensRaw = tokenize(normalizedModel).map((t) => canonicalizeToken(t, cfg));

  if (modelTokensRaw.length === 0) {
    const userEmpty = userTokensRaw.length === 0;
    return {
      isCorrect: userEmpty,
      matchRatio: userEmpty ? 1 : 0,
      matchedModelTokens: [],
      missingModelTokens: [],
      normalizedUser,
      normalizedModel,
    };
  }

  // Greedy match model tokens against user tokens (to avoid double counting).
  const userRemaining = [...userTokensRaw];
  const matchedModelTokens: string[] = [];
  const missingModelTokens: string[] = [];

  for (const mTok of modelTokensRaw) {
    let matchIdx = -1;
    for (let i = 0; i < userRemaining.length; i++) {
      if (tokenMatches(userRemaining[i], mTok, cfg)) {
        matchIdx = i;
        break;
      }
    }
    if (matchIdx !== -1) {
      matchedModelTokens.push(mTok);
      userRemaining.splice(matchIdx, 1);
    } else {
      missingModelTokens.push(mTok);
    }
  }

  const matchRatio = clamp01(matchedModelTokens.length / modelTokensRaw.length);
  const isCorrect = matchRatio >= cfg.matchRatioThreshold;

  return {
    isCorrect,
    matchRatio,
    matchedModelTokens,
    missingModelTokens,
    normalizedUser,
    normalizedModel,
  };
}

