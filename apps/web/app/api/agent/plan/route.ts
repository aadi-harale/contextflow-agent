export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const configured = process.env.CONTEXTFLOW_AGENT_API_URL;
  const baseUrl = configured || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:8000' : '');

  if (!baseUrl) {
    return Response.json(
      {
        ok: false,
        configured: false,
        error: 'CONTEXTFLOW_AGENT_API_URL is not configured for this deployment.',
      },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/agent/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction:
          body.instruction ||
          'Process claim CF-1842. Inspect evidence, evaluate reimbursement policy, and produce a safe browser plan using opaque secret references only.',
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000),
    });

    const payload = await response.json().catch(() => ({ detail: 'Invalid backend response' }));
    if (!response.ok) {
      return Response.json({ ok: false, configured: true, backend: payload }, { status: response.status });
    }

    return Response.json({ ok: true, configured: true, backend: payload });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        configured: true,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 },
    );
  }
}
