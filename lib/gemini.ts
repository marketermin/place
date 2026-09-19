import 'server-only';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Gemini is intentionally limited to explaining already-recorded facts.
 * It never invents or writes a Naver rank. The API key is read only on the server.
 */
export async function summarizeRankData(input: {
  businessName: string;
  keyword: string;
  currentRank: number | null;
  qualifyingDays: number;
  remainingDays: number;
  recentRanks: Array<{ date: string; rank: number | null }>;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  const prompt = [
    '한국어로 짧고 현실적인 관리 메모를 작성해 주세요.',
    '입력된 사실만 사용하고 순위를 추측하거나 새 데이터를 만들지 마세요.',
    '상위 5위 누적 목표 서비스의 관리자에게 보여줄 문장 2~3개를 작성하세요.',
    JSON.stringify(input),
  ].join('\n');
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 250 } }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Gemini 요청이 실패했습니다. (${response.status})`);
  const json = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error('Gemini가 요약을 반환하지 않았습니다.');
  return text;
}

export function geminiConfigured() { return Boolean(process.env.GEMINI_API_KEY); }
