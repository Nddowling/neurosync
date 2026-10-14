export interface SafeEvent { requestId: string; status: number; event: 'request_complete' | 'request_failed' }
export type SafeLogger = (event: SafeEvent) => void;
// Callers cannot pass URLs, headers, exception objects, SQL or clinical bodies.
export const safeLogger: SafeLogger = event => {
  process.stdout.write(JSON.stringify({ event: event.event, requestId: event.requestId, status: event.status }) + '\n');
};
