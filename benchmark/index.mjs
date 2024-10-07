import createTimeSpan from '@kikobeats/time-span'
import zlib from 'zlib'

const timeSpan = createTimeSpan()

const url = process.argv[2]

const response = await fetch(process.argv[2], {
  headers: { 'accept-encoding': 'identity' }
})

const buffer = Buffer.from(await response.arrayBuffer())

console.log()
console.log(`benchmarking ${url} payload – ${buffer.length}`)
console.log()

const percent = value => `${Number(value).toFixed(2)}%`

const ratio = (compressed, buffer) => 100 - (compressed.length / buffer.length * 100)

const efficiency = (compressed, buffer, time) => ratio(compressed, buffer) / time

const mostEfficient = collection => {
  const index = collection.reduce((bestIndex, current, index, array) => {
    const best = array[bestIndex]
    if (current.efficiency > best.efficiency) return index
    return bestIndex
  }, 0)

  return collection[index]
}

const brotliResults = []

for (let level = zlib.constants.BROTLI_MIN_QUALITY - 1; level <= zlib.constants.BROTLI_MAX_QUALITY; level++) {
  const duration = timeSpan()
  const compressed = zlib.brotliCompressSync(buffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: level } })
  const end = duration()

  const annotation = (() => {
    const note = []
    if (level === zlib.constants.BROTLI_DEFAULT_QUALITY) note.push('(BROTLI_DEFAULT_QUALITY)')
    if (level === zlib.constants.BROTLI_MIN_QUALITY) note.push('(BROTLI_MIN_QUALITY)')
    if (level === zlib.constants.BROTLI_MAX_QUALITY) note.push('(BROTLI_MAX_QUALITY)')
    return note.join(' ')
  })()

  const result = { level, bytes: compressed.length, ratio: ratio(compressed, buffer), annotation, efficiency: efficiency(compressed, buffer, end) }
  brotliResults.push(result)
}

brotliResults.forEach(({ level, bytes, ratio, efficiency, annotation }) => {
  console.log(`brotli level=${level} bytes=${bytes} ratio=${percent(ratio)} efficiency=${percent(efficiency)}\t${annotation}`)
})

const brotliMostEfficient = mostEfficient(brotliResults)

console.log()
console.log(`preferred brotli level: ${brotliMostEfficient.level} with efficiency=${percent(brotliMostEfficient.efficiency)} and ratio=${percent(brotliMostEfficient.ratio)}`)
console.log()

const gzipResults = []

for (let level = zlib.constants.Z_MIN_LEVEL; level <= zlib.constants.Z_MAX_LEVEL; level++) {
  const finish = timeSpan()
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

  const result = { level, bytes: compressed.length, ratio: ratio(compressed, buffer), annotation, efficiency: efficiency(compressed, buffer, end) }
  gzipResults.push(result)
}

gzipResults.forEach(({ level, bytes, ratio, efficiency, annotation }) => {
  console.log(`brotli level=${level} bytes=${bytes} ratio=${percent(ratio)} efficiency=${percent(efficiency)}\t${annotation}`)
})

const gzipMostEfficient = mostEfficient(gzipResults)

console.log()
console.log(`preferred gzip level: ${gzipMostEfficient.level} with efficiency=${percent(gzipMostEfficient.efficiency)} and ratio=${percent(gzipMostEfficient.ratio)}`)
console.log()

const deflateResults = []

for (let level = zlib.constants.Z_MIN_LEVEL; level <= zlib.constants.Z_MAX_LEVEL; level++) {
  const finish = timeSpan()
  const compressed = zlib.deflateSync(buffer, { level })
  const end = finish()

  const result = { level, bytes: compressed.length, ratio: ratio(compressed, buffer), efficiency: efficiency(compressed, buffer, end) }
  deflateResults.push(result)
}

deflateResults.forEach(({ level, bytes, ratio, efficiency, annotation }) => {
  console.log(`brotli level=${level} bytes=${bytes} ratio=${percent(ratio)} efficiency=${percent(efficiency)}\t${annotation}`)
})

const deflateMostEfficient = mostEfficient(deflateResults)

console.log()
console.log(`preferred gzip level: ${deflateMostEfficient.level} with efficiency=${percent(deflateMostEfficient.efficiency)} and ratio=${percent(deflateMostEfficient.ratio)}`)
console.log()
