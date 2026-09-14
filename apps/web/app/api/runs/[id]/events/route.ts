import { buildDemoRun } from '@/lib/runtime';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const events = buildDemoRun(id);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        await new Promise((resolve) => setTimeout(resolve, 420));
      }
      controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
