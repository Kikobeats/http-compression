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
console.log(`benchmarking ${url} payload – ${buffer.length}`)
console.log()

const percent = value => `${Number(value).toFixed(2)}%`

const ratio = (compressed, buffer) => 100 - (compressed.length / buffer.length * 100)

const efficiency = (compressed, buffer, time) => ratio(compressed, buffer) / time

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

  console.log(`brotli level=${level} bytes=${compressed.length} end=${end} ratio=${percent(ratio(compressed, buffer))} efficiency=${percent(efficiency(compressed, buffer, end))}\t${annotation}`)
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

  console.log(`gzip level=${level} bytes=${compressed.length} end=${end} ratio=${percent(ratio(compressed, buffer))} efficiency=${percent(efficiency(compressed, buffer, end))}\t${annotation}`)
}

console.log()

for (let level = zlib.constants.Z_MIN_LEVEL; level <= zlib.constants.Z_MAX_LEVEL; level++) {
  const finish = timestamp()
  const compressed = zlib.deflateSync(buffer, { level })
  const end = finish()

  console.log(`deflate level=${level} bytes=${compressed.length} end=${end} ratio=${percent(ratio(compressed, buffer))} efficiency=${percent(efficiency(compressed, buffer, end))}`)
}
