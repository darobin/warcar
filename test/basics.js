
import { createReadStream } from 'node:fs';
import makeRel from '../lib/rel.js';
import { warc2car } from '../index.js';

const rel = makeRel(import.meta.url);
const example = rel('data/example.warc');

describe('Basic Functionality', () => {
  it('converts a simple WARC', async () => {
    const warcStream = createReadStream(example);
    await warc2car(warcStream);
  });
});
