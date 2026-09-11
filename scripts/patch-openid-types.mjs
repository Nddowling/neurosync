// openid-client 6.8.8's class getters explicitly return undefined, while its
// implemented interface omits that alternative under exactOptionalPropertyTypes.
// Correct only those declarations; do not disable library checking or alter runtime.
import { readFile, writeFile } from 'node:fs/promises';
const file = new URL('../node_modules/openid-client/build/index.d.ts', import.meta.url);
const source = await readFile(file, 'utf8');
const start = source.indexOf('export interface ConfigurationProperties {');
const end = source.indexOf('\n}', start);
if (start < 0 || end < 0) throw new Error('Review OIDC declaration compatibility patch after dependency upgrade');
const before = source.slice(start,end);
const after = before.replace('timeout?: number;', 'timeout?: number | undefined;')
  .replace('[customFetch]?: CustomFetch;', '[customFetch]?: CustomFetch | undefined;');
await writeFile(file, source.slice(0,start) + after + source.slice(end));
