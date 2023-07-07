import prettyBytes from 'pretty-bytes'
import prettyMs from 'pretty-ms'
import zlib from 'zlib'

const timestamp = (start = process.hrtime.bigint()) => () =>
  Number(process.hrtime.bigint() - start) / 1e6

const url = process.argv[2]

const response = await fetch(process.argv[2], {
  headers: {
    'accept-encoding': 'identity'
  }
})

const buffer = Buffer.from(await response.arrayBuffer())

console.log()
console.log(`benchmarking ${url} payload – ${prettyBytes(buffer.length)}`)
console.log()

for (let level = zlib.constants.BROTLI_MIN_QUALITY - 1; level <= zlib.constants.BROTLI_MAX_QUALITY; level++) {
  const finish = timestamp()
  const compressed = zlib.brotliCompressSync(buffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: level } })
  const end = finish()

  const annotation = (() => {
    const note = []
    if (level === zlib.constants.BROTLI_DEFAULT_QUALITY) note.push('(BROTLI_DEFAULT_QUALITY)')
    if (level === zlib.constants.BROTLI_MIN_QUALITY) note.push('(BROTLI_MIN_QUALITY)')
    if (level === zlib.constants.BROTLI_MAX_QUALITY) note.push('(BROTLI_MAX_QUALITY)')
    return note.join(' ')
  })()

  console.log(`brotli level=${level} bytes=${prettyBytes(compressed.length)} time=${prettyMs(end)}\t${annotation}`)
}

console.log()

for (let level = zlib.constants.Z_MIN_LEVEL; level <= zlib.constants.Z_MAX_LEVEL; level++) {
  const finish = timestamp()
  const compressed = zlib.gzipSync(buffer, { level })
  const end = finish()

  const annotation = (() => {
    const note = []
    if (level === zlib.constants.Z_BEST_COMPRESSION) note.push('(Z_BEST_COMPRESSION)')
    if (level === zlib.constants.Z_DEFAULT_COMPRESSION) note.push('(Z_DEFAULT_COMPRESSION)')
    if (level === zlib.constants.Z_BEST_SPEED) note.push('(Z_BEST_SPEED)')
    if (level === zlib.constants.Z_NO_COMPRESSION) note.push('(Z_NO_COMPRESSION)')
    return note.join(' ')
  })()

  console.log(`gzip level=${level} bytes=${prettyBytes(compressed.length)} time=${prettyMs(end)}\t${annotation}`)
}

console.log()

for (let level = zlib.constants.Z_MIN_LEVEL; level <= zlib.constants.Z_MAX_LEVEL; level++) {
  const finish = timestamp()
  const compressed = zlib.deflateSync(buffer, { level })
  const end = finish()
  console.log(`deflate level=${level} bytes=${prettyBytes(compressed.length)} time=${prettyMs(end)}`)
}
