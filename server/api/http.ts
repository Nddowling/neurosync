import { createServer } from 'node:http';
import { MAX_BODY_BYTES } from './app.js';

export function createHttpServer(app: (request: Request) => Promise<Response>) {
const server = createServer({ requestTimeout: 15000, headersTimeout: 10000, maxHeaderSize: 8192 }, async (incoming, outgoing) => {
  try {
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of incoming.iterator({ destroyOnReturn: false })) {
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      bytes += value.length;
      if (bytes > MAX_BODY_BYTES) {
        outgoing.writeHead(413, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Connection': 'close' });
        outgoing.end('{"error":"payload_too_large"}');
        return;
      }
      chunks.push(value);
    }
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (typeof value === 'string') headers.set(name, value);
      else if (value) headers.set(name, value.join(', '));
    }
    const method = incoming.method ?? 'GET';
    // Do not trust Host or forwarded headers to construct an origin.
    const request = new Request(`http://neurosync.internal${incoming.url ?? '/'}`, {
      method, headers, ...(['GET','HEAD'].includes(method) ? {} : { body: Buffer.concat(chunks) }),
    });
    const response = await app(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    if (!outgoing.headersSent) outgoing.writeHead(500, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    outgoing.end('{"error":"internal_error"}');
  }
});
server.maxRequestsPerSocket = 100;
return server;
}
