
# warcar — experimental WARC to CAR (and back) converter

## WARC

A WARC file is a series of WARC records.

Each WARC record is:

1. header: the first line, indicating that this is WARC in a given version "WARC/1.1"
   (NOTE: everything that follows this is considered content, even the headers)
2. named fields: lines of colon-separated key/value pairs metadata (effectively, headers)
   followed by a skipped line
3. payload: bytes

There are eight record types:

- **warcinfo**: Metadata describing all the records that follow, until the end or next warcinfo.
  (No payload.) Encoded just as a DRISL object in its own CAR entry.
- **response**: XXX
- **resource**: XXX
- **request**: XXX
- **metadata**: XXX (No payload.)
- **revisit**: XXX
- **conversion**: XXX
- **continuation**: XXX

## Conversion to CAR

It would be tempting to use MASL but there is no guarantee that WARC is used for a single
site. The default conversion is therefore to stream to a CAR, in a very basic manner. Both
`warcinfo` and `metadata` types get no payload, all others get a `payload-cid` field that
links to the CID of the payload. Normally payloads follow the headers they're for, but they
might not (e.g. if they've already been seen).

In order to be predictable in case-sensitive DRISL, all named fields are lowercased. They are
typed to work in DRISL, too.

## Conversion to MASL / Tile

This assumes that all entries target the same site. It fails if they don't. It produces an
executable tile with the right metadata for the content.
