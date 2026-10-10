export const STORAGE_KEY = 'nawras-this-or-that:leaderboard:v2';
export const LEGACY_STORAGE_KEY = 'nawras-this-or-that:leaderboard:v1';

// Integer centiseconds are the single precision used for persistence, ties and display.
export function normalizeResult(value) {
  if (!value || typeof value !== 'object') return null;
  const { playerId, resultId, name, score, answerTimeCs } = value;
  if (![playerId, resultId, name].every(x => typeof x === 'string' && x.trim())) return null;
  if (!Number.isInteger(score) || score < 0 || score > 100 || score % 10 !== 0) return null;
  if (!Number.isSafeInteger(answerTimeCs) || answerTimeCs < 0) return null;
  return { playerId, resultId, name: name.trim(), score, answerTimeCs };
}

export function compareResults(a, b) {
  return b.score - a.score || a.answerTimeCs - b.answerTimeCs;
}

export function bestResults(values) {
  const players = new Map();
  const seen = new Set();
  for (const value of values) {
    const result = normalizeResult(value);
    if (!result || seen.has(result.resultId)) continue;
    seen.add(result.resultId);
    const previous = players.get(result.playerId);
    if (!previous || compareResults(result, previous) < 0) players.set(result.playerId, result);
  }
  return [...players.values()];
}

export function rankResults(values) {
  const sorted = bestResults(values).sort(compareResults);
  let rank = 0;
  return sorted.map((result, index) => {
    if (!index || compareResults(result, sorted[index - 1]) !== 0) rank = index + 1;
    return { ...result, rank };
  });
}

export const formatTime = cs => `${Math.floor(cs / 100)}.${String(cs % 100).padStart(2, '0')} s`;

export function createLeaderboardStore(storage) {
  function read() {
    try {
      const current = storage.getItem(STORAGE_KEY);
      const raw = current ?? storage.getItem(LEGACY_STORAGE_KEY);
      if (raw === null) return { results: [], error: null };
      const data = JSON.parse(raw);
      if (data?.version !== (current === null ? 1 : 2) || !Array.isArray(data.results)) throw new Error('Invalid data');
      const values = current === null ? data.results.map(value => {
        if (!value || !Number.isSafeInteger(value.answerTimeMs) || value.answerTimeMs < 0) return null;
        return { ...value, answerTimeCs: Math.round(value.answerTimeMs / 10) };
      }) : data.results;
      return { results: bestResults(values), error: null };
    } catch {
      return { results: [], error: 'Saved leaderboard could not be read.' };
    }
  }
  function saveCompletedResult(value) {
    const result = normalizeResult(value);
    if (!result) throw new TypeError('Invalid completed result');
    const results = bestResults([...read().results, result]);
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, results }));
      return { results, error: null };
    } catch {
      return { results: read().results, error: 'Result could not be saved in this browser.' };
    }
  }
  function clear() {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, results: [] }));
      storage.removeItem(LEGACY_STORAGE_KEY);
      storage.removeItem(STORAGE_KEY);
      return { error: null };
    }
    catch { return { error: 'Leaderboard could not be cleared in this browser.' }; }
  }
  return { read, saveCompletedResult, clear };
}
