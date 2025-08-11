
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import makeRel from '../lib/rel.js';
import { warc2car } from '../index.js';

const rel = makeRel(import.meta.url);
const example = rel('data/example.warc');

describe('Basic Functionality', () => {
  it('converts a simple WARC', async () => {
    const dir = await makeTempDir();
    const warcStream = createReadStream(example);
    const carStream = createWriteStream(join(dir, 'basic.car'))
    await warc2car(warcStream, carStream);
  });
});

async function makeTempDir () {
  return await mkdtemp(join(tmpdir(), 'warcar-'));
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
