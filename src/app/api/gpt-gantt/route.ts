// 사용하지 않는 중복 API - gpt-comprehensive에서 간트차트 처리함
// 향후 필요시 복원을 위해 비활성화된 상태로 유지

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'This API endpoint has been disabled. Use /api/gpt-comprehensive instead.' },
    { status: 410 }
  );
}

/* 
원본 코드는 주석으로 보존:

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  // ... 기존 코드 전체가 여기에 있었음
}
*/