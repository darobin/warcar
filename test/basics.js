
import { equal, deepStrictEqual } from "node:assert";
import { Buffer } from "node:buffer";
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { WARCParser } from "warcio";
import { create as createCID, CODEC_DCBOR as CODEC_DRISL, CODEC_RAW, toString as stringifyCID } from "@atcute/cid";
import { decode as decodeDRISL } from '@atcute/cbor';
import { CarReader } from '@atcute/car/v4';
import makeRel from '../lib/rel.js';
import { warc2car } from '../index.js';

const rel = makeRel(import.meta.url);
const example = rel('data/example.warc');

describe('Basic Functionality', () => {
  it('converts a simple WARC to CAR', async () => {
    // make a CAR
    const dir = await makeTempDir();
    const output = join(dir, 'basic.car');
    await warc2car(createReadStream(example), createWriteStream(output));
    // read the CAR back
    const car = CarReader.fromStream(createReadStream(output));
    const carHeader = await car.header();
    deepStrictEqual(carHeader, { version: 1, roots: [] }, 'header is correct');

    // compare the two
    const objects = await warc2object(example);
    const carContent = [];
    for (const { cid, bytes } of car) {
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
      equal(obj.warcHeaders['headers-cid'], car.httpHeadersCID, 'HTTP header CIDs match');
      // - same payload CID if there
      // - same warc headers after CIDs deleted
      // - same http headers
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
    if (warcHeaders) cur.warcHeaders = headers2object(warcHeaders.headers);
    if (httpHeaders) cur.httpHeaders = headers2object(httpHeaders.headers);
    const chunks = [];
    for await (const chunk of record) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    if (buffer.byteLength) cur.payloadCID = stringifyCID(await createCID(CODEC_RAW, buffer));
    ret.push(cur);
  }
  return ret;
}


function headers2object (h) {
  const ret = {};
  for (const [k, v] of h) ret[k] = v;
  return ret;
}



// warcinfo
// null
// Headers {
//   'WARC-Date': '2017-03-06T04:03:53Z',
//   'WARC-Record-ID': '<urn:uuid:e9a0cecc-0221-11e7-adb1-0242ac120008>',
//   'WARC-Filename': 'temp-20170306040353.warc.gz',
//   'WARC-Type': 'warcinfo',
//   'Content-Type': 'application/warc-fields',
//   'Content-Length': '249'
// }
//  - 249
// warcinfo
// null
// Headers {
//   'WARC-Date': '2017-03-06T04:03:53Z',
//   'WARC-Record-ID': '<urn:uuid:e9a0ee48-0221-11e7-adb1-0242ac120008>',
//   'WARC-Filename': 'temp-20170306040353.warc.gz',
//   'WARC-Type': 'warcinfo',
//   'Content-Type': 'application/warc-fields',
//   'Content-Length': '470'
// }
//  - 470
// response
// http://example.com/
// Headers {
//   'WARC-Target-URI': 'http://example.com/',
//   'WARC-Date': '2017-03-06T04:02:06Z',
//   'WARC-Type': 'response',
//   'WARC-Record-ID': '<urn:uuid:a9c51e3e-0221-11e7-bf66-0242ac120005>',
//   'WARC-IP-Address': '93.184.216.34',
//   'WARC-Block-Digest': 'sha1:DR5MBP7OD3OPA7RFKWJUD4CTNUQUGFC5',
//   'WARC-Payload-Digest': 'sha1:G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK',
//   'Content-Type': 'application/http; msgtype=response',
//   'Content-Length': '975'
// }
//  - 1270
// request
// http://example.com/
// Headers {
//   'WARC-Type': 'request',
//   'WARC-Record-ID': '<urn:uuid:a9c5c23a-0221-11e7-8fe3-0242ac120007>',
//   'WARC-Target-URI': 'http://example.com/',
//   'WARC-Date': '2017-03-06T04:02:06Z',
//   'WARC-Concurrent-To': '<urn:uuid:a9c51e3e-0221-11e7-bf66-0242ac120005>',
//   'Content-Type': 'application/http; msgtype=request',
//   'Content-Length': '493'
// }
// revisit
// http://example.com/
// Headers {
//   'WARC-Target-URI': 'http://example.com/',
//   'WARC-Date': '2017-03-06T04:03:48Z',
//   'WARC-Type': 'revisit',
//   'WARC-Record-ID': '<urn:uuid:e6e395ca-0221-11e7-a18d-0242ac120005>',
//   'WARC-IP-Address': '93.184.216.34',
//   'WARC-Block-Digest': 'sha1:W5NMHSQVKVJVH3GFFGY7J7SJNY7GMGGO',
//   'WARC-Payload-Digest': 'sha1:G7HRM7BGOKSKMSXZAHMUQTTV53QOFSMK',
//   'WARC-Profile': 'http://netpreserve.org/warc/1.0/revisit/uri-agnostic-identical-payload-digest',
//   'WARC-Refers-To-Target-URI': 'http://example.com/',
//   'WARC-Refers-To-Date': '2017-03-06T04:02:06Z',
//   'Content-Type': 'application/http; msgtype=response',
//   'Content-Length': '369'
// }
// request
// http://example.com/
// Headers {
//   'WARC-Type': 'request',
//   'WARC-Record-ID': '<urn:uuid:e6e41fea-0221-11e7-8fe3-0242ac120007>',
//   'WARC-Target-URI': 'http://example.com/',
//   'WARC-Date': '2017-03-06T04:03:48Z',
//   'WARC-Concurrent-To': '<urn:uuid:e6e395ca-0221-11e7-a18d-0242ac120005>',
//   'Content-Type': 'application/http; msgtype=request',
//   'Content-Length': '493'
// }
// metadata
// http://example.com/
// Headers {
//   'WARC-Target-URI': 'http://example.com/',
//   'WARC-Date': '2017-03-06T04:00:50Z',
//   'WARC-Type': 'metadata',
//   'WARC-Record-ID': '<urn:uuid:5f179447-fa3d-4735-b23b-3559480afc88>',
//   'Content-Type': 'application/warc-fields',
//   'WARC-Payload-Digest': 'sha256:9d63c3b5b7623d1fa3dc7fd1547313b9546c6d0fbbb6773a420613b7a17995c8',
//   'WARC-Block-Digest': 'sha256:9d63c3b5b7623d1fa3dc7fd1547313b9546c6d0fbbb6773a420613b7a17995c8',
//   'Content-Length': '15'
// }
//  - 15
