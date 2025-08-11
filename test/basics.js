
import { equal, deepStrictEqual } from "node:assert";
import { Buffer } from "node:buffer";
import { Readable } from 'node:stream';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WARCParser } from "warcio";
import { create as createCID, CODEC_DCBOR as CODEC_DRISL, CODEC_RAW, toString as stringifyCID } from "@atcute/cid";
import { decode as decodeDRISL } from '@atcute/cbor';
import { CarReader } from '@atcute/car/v4';
import makeRel from '../lib/rel.js';
import { warc2car, castForDRISL } from '../index.js';

const rel = makeRel(import.meta.url);
const example = rel('data/example.warc');

describe('Basic Functionality', () => {
  it('converts a simple WARC to CAR', async () => {
    // make a CAR
    const dir = await makeTempDir();
    const output = join(dir, 'basic.car');
    await warc2car(createReadStream(example), createWriteStream(output));
    // read the CAR back
    const car = CarReader.fromStream(Readable.toWeb(createReadStream(output)));
    const carHeader = await car.header();
    deepStrictEqual(carHeader?.data, { version: 1, roots: [] }, 'header is correct');

    // compare the two
    const objects = await warc2object(example);
    const carContent = [];
    for await (const { cid, bytes } of car) {
      if (cid.codec === CODEC_DRISL) {
        const data = decodeDRISL(bytes);
        if (data['warc-type']) carContent.push({ warcHeaders: data });
        else {
          carContent[carContent.length - 1].httpHeaders = data;
          carContent[carContent.length - 1].httpHeadersCID = cid;
        }
      }
      else carContent[carContent.length - 1].payloadCID = cid;
    }
    carContent.forEach(car => {
      const obj = objects.shift();
      const payloadCID = car.warcHeaders['payload-cid'];
      delete car.warcHeaders['headers-cid'];
      delete car.warcHeaders['payload-cid'];
      deepStrictEqual(car.warcHeaders, obj.warcHeaders, 'WARC headers match');
      deepStrictEqual(car.httpHeaders, obj.httpHeaders, 'HTTP headers match');
      equal(car.payloadCID, payloadCID, 'payload matches');
    });
  });
});

async function makeTempDir () {
  return await mkdtemp(join(tmpdir(), 'warcar-'));
}

async function warc2object (input) {
  const parser = new WARCParser(createReadStream(input));
  const ret = [];
  for await (const record of parser) {
    const { warcHeaders, httpHeaders } = record;
    const cur = {};
    if (warcHeaders) cur.warcHeaders = castForDRISL(warcHeaders.headers);
    if (httpHeaders) cur.httpHeaders = castForDRISL(httpHeaders.headers);
    const chunks = [];
    for await (const chunk of record) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    if (buffer.byteLength) cur.payloadCID = stringifyCID(await createCID(CODEC_RAW, buffer));
    ret.push(cur);
  }
  return ret;
}
