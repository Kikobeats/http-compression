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

const ratio = (compressed, buffer) => 100 - (compressed.length / buffer.length) * 100

const efficiency = (compressed, buffer, time, timeWeight = 0.7) => {
  const compRatio = ratio(compressed, buffer)
  // Adjust the timeWeight to prioritize time more or less
  return compRatio * (1 - timeWeight) + (1 / time) * timeWeight * 100
}

const mostEfficient = collection =>
  collection.reduce((bestIndex, current, index, array) => {
    const best = array[bestIndex]
    if (current.efficiency > best.efficiency) return index
    return bestIndex
  }, 0)

const run = compress => {
  const duration = timeSpan()
  const compressed = compress()
  const end = duration()
  return {
    ratio: ratio(compressed, buffer),
    efficiency: efficiency(compressed, buffer, end)
  }
}

const bench = (compress, iterations = 100) => {
  const results = []

  for (let i = 0; i < iterations; i++) {
    results.push(run(compress))
  }

  const ratio = results.reduce((acc, { ratio }) => acc + ratio, 0) / results.length
  const efficiency = results.reduce((acc, { efficiency }) => acc + efficiency, 0) / results.length
  return { ratio, efficiency }
}

function brotli () {
  const results = []

  for (let level = zlib.constants.BROTLI_MIN_QUALITY - 1; level <= zlib.constants.BROTLI_MAX_QUALITY; level++) {
    const { ratio, efficiency } = bench(() =>
      zlib.brotliCompressSync(buffer, {
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: level }
      })
    )

    const annotation = (() => {
      const note = []
      if (level === zlib.constants.BROTLI_DEFAULT_QUALITY) {
        note.push('(BROTLI_DEFAULT_QUALITY)')
      }
      if (level === zlib.constants.BROTLI_MIN_QUALITY) {
        note.push('(BROTLI_MIN_QUALITY)')
      }
      if (level === zlib.constants.BROTLI_MAX_QUALITY) {
        note.push('(BROTLI_MAX_QUALITY)')
      }
      return note.join(' ')
    })()

    results.push({
      level,
      ratio,
      annotation,
      efficiency,
      toString: () => `brotli level=${level} ratio=${percent(ratio)} efficiency=${percent(efficiency)}\t${annotation}`
    })
  }

  results.forEach(item => console.log(item.toString()))
  console.log(`\npreferred brotli level: ${results[mostEfficient(results)].toString()}\n`)
}

function gzip () {
  const results = []

  for (let level = zlib.constants.Z_MIN_LEVEL; level <= zlib.constants.Z_MAX_LEVEL; level++) {
    // level 0 is no compression
    if (level === 0) continue
    const { ratio, efficiency } = bench(() => zlib.gzipSync(buffer, { level }))

    const annotation = (() => {
      const note = []
      if (level === zlib.constants.Z_BEST_COMPRESSION) note.push('(Z_BEST_COMPRESSION)')
      if (level === zlib.constants.Z_DEFAULT_COMPRESSION) note.push('(Z_DEFAULT_COMPRESSION)')
      if (level === zlib.constants.Z_BEST_SPEED) note.push('(Z_BEST_SPEED)')
      if (level === zlib.constants.Z_NO_COMPRESSION) note.push('(Z_NO_COMPRESSION)')
      return note.join(' ')
    })()

    results.push({
      level,
      ratio,
      annotation,
      efficiency,
      toString: () => `gzip level=${level} ratio=${percent(ratio)} efficiency=${percent(efficiency)}\t${annotation}`
    })
  }

  results.forEach(item => console.log(item.toString()))
  console.log(`\npreferred gzip level: ${results[mostEfficient(results)].toString()}\n`)
}

function deflate () {
  const results = []

  for (let level = zlib.constants.Z_MIN_LEVEL; level <= zlib.constants.Z_MAX_LEVEL; level++) {
    // level 0 is no compression
    if (level === 0) continue
    const { ratio, efficiency } = bench(() => zlib.deflateSync(buffer, { level }))
    results.push({
      level,
      ratio,
      efficiency,
      toString: () => `deflate level=${level} ratio=${percent(ratio)} efficiency=${percent(efficiency)}\t`
    })
  }

  results.forEach(item => console.log(item.toString()))
  console.log(`\npreferred deflate level: ${results[mostEfficient(results)].toString()}\n`)
}

brotli()
gzip()
deflate()
