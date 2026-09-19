import { NextResponse } from 'next/server';
import { summarizeRankData } from '@/lib/gemini';
import { requireAdmin } from '@/lib/supabase';
import { z } from 'zod';

const inputSchema = z.object({
  businessName: z.string().min(1).max(100), keyword: z.string().min(1).max(100),
  currentRank: z.number().int().min(1).max(100000).nullable(), qualifyingDays: z.number().int().min(0).max(10000),
  remainingDays: z.number().int().min(0).max(25), recentRanks: z.array(z.object({ date: z.string(), rank: z.number().int().min(1).max(100000).nullable() })).max(30),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = inputSchema.parse(await request.json());
    return NextResponse.json({ summary: await summarizeRankData(input) });
  } catch (error) {
    const message = error instanceof Error ? error.message : '요약을 만들지 못했습니다.';
    const status = message.includes('로그인') || message.includes('관리자') ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
