
import { Buffer } from "node:buffer";
import { WARCParser } from "warcio";
import { encode as encodeDRISL } from '@atcute/cbor';
import { encode as encodeVarint } from '@atcute/varint';
import { create as createCID, CODEC_DCBOR as CODEC_DRISL, CODEC_RAW, toString as stringifyCID } from "@atcute/cid";

export const WARC_TYPE = 'WARC';
export const CAR_TYPE = 'CAR';
export const TILE_TYPE = 'TILE';
export const UNKNOWN_TYPE = 'UNKNOWN';

class CARStreamWriter {
  #stream;
  constructor(stream) {
    this.#stream = stream;
  }
  writeVarInt(num) {
    const varint = [];
    encodeVarint(num, varint);
    this.#stream.write(new Uint8Array(varint));
  }
  writeCARMetadata () {
    const carMetadata = encodeDRISL({
      version: 1,
      roots: [],
    });
    this.writeVarInt(carMetadata.byteLength);
    this.#stream.write(carMetadata);
  }
  async writeBlock (type, bytes) {
    const cid = await createCID(type, bytes);
    this.writeVarInt(bytes.byteLength + cid.bytes.byteLength);
    this.#stream.write(cid.bytes);
    this.#stream.write(bytes);
  }
  async writeDRISL (data) {
    const drisl = encodeDRISL(data);
    return await this.writeBlock(CODEC_DRISL, drisl);
  }
  async writeRaw (data) {
    return await this.writeBlock(CODEC_RAW, data);
  }
}

// TODO:
//  - should we handle application/warc-fields as DRISL
export async function warc2car (warcStream, carStream) {
  const parser = new WARCParser(warcStream);
  const carWriter = new CARStreamWriter(carStream);
  // Write us some CAR headers
  carWriter.writeCARMetadata();

  // For each WARC record
  const seenPayloads = new Set();
  for await (const record of parser) {
    const { warcType: type, warcHeaders: { headers } } = record;
    // These have no payload, just encode the DRISL
    if (type === 'warcinfo' || type === 'metadata') {
      carWriter.writeDRISL(castForDRISL(headers));
    }
    else {
      const chunks = [];
      for await (const chunk of record) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      const cid = await createCID(CODEC_RAW, buffer);
      const cidStr = stringifyCID(cid);
      headers.set('payload-cid', cid);
      carWriter.writeDRISL(castForDRISL(headers));
      if (seenPayloads.has(cidStr)) continue;
      seenPayloads.add(cidStr);
      carWriter.writeRaw(buffer);
    }
  }
}

export async function car2warc (carStream, warcStream) {
  // XXX
  // - ignore CAR headers
  // - keep track of all payloads by CID
  // - iterate through CAR blocks
  // - if it's payload-less just emit that
  // - otherwise remove the payload-cid header, emit this, then peek at next to see if it's the right one
  //  - if not the right one, we have to find it back
  //  - if it is, just emit that
}

export async function warc2tile (warcStream, tileStream) {
  // - ignore all the irrelevant ones
  // - create a MASL mapping using the metadata (but you want the HTTP headers, not the WARC ones)
  // - need a temp with all the bytes and CIDs
}


const numericFields = {
  'content-length': 'integer',
  'warc-segment-number': 'integer',
  'warc-segment-total-length': 'integer',
};
function castForDRISL (fields) {
  if (fields instanceof Headers) fields = headers2object(fields);
  const ret = {};
  Object.keys(fields).forEach(k => {
    const key = k.toLowerCase();
    if (numericFields[key]) ret[key] = parseInt(fields[k], 10) || 0;
    else ret[key] = fields[k];
  });
}

function headers2object (h) {
  const ret = {};
  for (const [k, v] of h) ret[k] = v;
  return ret;
}
