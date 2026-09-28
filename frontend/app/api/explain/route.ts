import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${API_BASE}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
      return NextResponse.json({ explanation: null, error: err.detail }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ explanation: null, error: msg }, { status: 500 });
  }
}
