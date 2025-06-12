
import { WARCParser } from "warcio";

export const WARC_TYPE = 'WARC';
export const CAR_TYPE = 'CAR';
export const UNKNOWN_TYPE = 'UNKNOWN';

export async function warc2car(warcStream, carStream) {
  const parser = new WARCParser(warcStream);
  for await (const record of parser) {
    console.log(record.warcType);
    console.log(record.warcTargetURI);
    console.log(record.warcHeaders.headers);
    for await (const chunk of record) {
      console.log(` - ${chunk.length}`);
    }
  }
}

export async function car2warc (carStream, warcStream) {
  //
}
