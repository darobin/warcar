#!/usr/bin/env node

import { cwd, exit } from "node:process";
import { isAbsolute, join, extname } from "node:path";
import { createReadStream, createWriteStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { program } from 'commander';
import makeRel from './lib/rel.js';
import { WARC_TYPE, CAR_TYPE, UNKNOWN_TYPE, warc2car, car2warc } from "./index.js";

const rel = makeRel(import.meta.url);
const { version } = JSON.parse(await readFile(rel('./package.json')));

program
  .name('warcar')
  .description('Convert between WARC and CAR')
  .version(version)
  .argument('<input>', 'path to either a WARC or a CAR as input')
  .argument('<output>', 'path to either a CAR or a WARC as ouput (has to be different from the previous)')
  .action(async (input, output) => {
    input = absolutise(input);
    output = absolutise(output);
    const inputType = typeFromPath(input);
    const outputType = typeFromPath(output);
    if (inputType === outputType) die(`Both files are the same kind.`)
    if (inputType === UNKNOWN_TYPE) die(`File ${input} of unknown type.`)
    if (outputType === UNKNOWN_TYPE) die(`File ${outputType} of unknown type.`)
    if (inputType === WARC_TYPE) return await warc2car(createReadStream(input), createWriteStream(output));
    await car2warc(createReadStream(input), createWriteStream(output));
  })
;
program.parse();

function absolutise (path) {
  return isAbsolute(path) ? path : join(cwd(), path);
}

function typeFromPath (path) {
  const ext = extname(path).toLowerCase();
  if (ext === '.warc') return WARC_TYPE;
  if (ext === '.car') return CAR_TYPE;
  return UNKNOWN_TYPE;
}

function die (str) {
  console.error(`Error: ${str}`);
  exit(1);
}
