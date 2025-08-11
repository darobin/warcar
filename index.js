
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
    return cid;
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
//  - missing HTTP headers!!!
//  - warcinfo and metadata have payloads…
export async function warc2car (warcStream, carStream, options) {
  const parser = new WARCParser(warcStream);
  const carWriter = new CARStreamWriter(carStream);
  // Write us some CAR headers
  carWriter.writeCARMetadata();

  // For each WARC record
  const seenCIDs = new Set();
  for await (const record of parser) {
    const { warcHeaders, httpHeaders } = record;
    let cleanHTTPHeaders, headersCID, payloadCID, buffer;
    if (httpHeaders?.headers) {
      cleanHTTPHeaders = castForDRISL(httpHeaders.headers);
      headersCID = await createCID(CODEC_DRISL, encodeDRISL(cleanHTTPHeaders));
      warcHeaders.headers.set('headers-cid', headersCID);
    }
    const chunks = [];
    for await (const chunk of record) chunks.push(chunk);
    if (chunks.length) {
      buffer = Buffer.concat(chunks);
      payloadCID = await createCID(CODEC_RAW, buffer);
      warcHeaders.headers.set('payload-cid', payloadCID);
    }
    carWriter.writeDRISL(castForDRISL(warcHeaders.headers));
    if (cleanHTTPHeaders) {
      const headersCIDStr = stringifyCID(headersCID);
      if (!seenCIDs.has(headersCIDStr)) carWriter.writeDRISL(cleanHTTPHeaders);
      if (options?.skipSeenCIDs) seenCIDs.add(headersCIDStr);
    }
    if (chunks.length) {
      const cidStr = stringifyCID(payloadCID);
      if (!seenCIDs.has(cidStr)) carWriter.writeRaw(buffer);
      if (options?.skipSeenCIDs) seenCIDs.add(cidStr);
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
export function castForDRISL (fields) {
  if (fields instanceof Headers) fields = headers2object(fields);
  const ret = {};
  Object.keys(fields).forEach(k => {
    const key = k.toLowerCase();
    if (numericFields[key]) ret[key] = parseInt(fields[k], 10) || 0;
    else ret[key] = fields[k];
  });
  return ret;
}

function headers2object (h) {
  const ret = {};
  for (const [k, v] of h) ret[k] = v;
  return ret;
}
