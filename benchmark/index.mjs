import createTimeSpan from '@kikobeats/time-span'
import { Readable } from 'stream'
import { parseArgs } from 'util'
import http from 'http'
import zlib from 'zlib'

import compression from '../src/index.js'

const DEFAULT_MBPS = 100
const DEFAULT_MARGIN = 0.03
const NOISE_FLOOR_MS = 0.05
const CHUNK_SIZE = 64 * 1024
const MIN_RUNS = 5
const MAX_RUNS = 50
const TIME_BUDGET_MS = 500

const USAGE = 'usage: node benchmark/index.mjs [--mbps=100] [--margin=0.03] <url> [url...]'

const exitWithUsage = () => {
  console.error(USAGE)
  process.exit(1)
}

const parseFlags = () => {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        mbps: { type: 'string', default: String(DEFAULT_MBPS) },
        margin: { type: 'string', default: String(DEFAULT_MARGIN) }
      }
    })
  } catch {
    exitWithUsage()
  }
}

const { values: flags, positionals: urls } = parseFlags()

const mbps = Number(flags.mbps)
const margin = Number(flags.margin)

if (urls.length === 0 || !(mbps > 0) || !(margin >= 0)) exitWithUsage()

const bytesPerMs = (mbps * 1e6) / 8 / 1000
const timeSpan = createTimeSpan()

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index)

const ALGORITHMS = [
  {
    name: 'brotli',
    encoding: 'br',
    levels: range(zlib.constants.BROTLI_MIN_QUALITY, zlib.constants.BROTLI_MAX_QUALITY)
  },
  {
    name: 'gzip',
    encoding: 'gzip',
    levels: range(zlib.constants.Z_BEST_SPEED, zlib.constants.Z_BEST_COMPRESSION)
  }
]

const toChunks = buffer =>
  range(0, Math.ceil(buffer.length / CHUNK_SIZE) - 1).map(index =>
    buffer.subarray(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)
  )

const fetchPayload = async url => {
  const response = await fetch(url, { headers: { 'accept-encoding': 'identity' } })
  if (!response.ok) throw new Error(`${url} answered ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

const payloads = []
for (const url of urls) payloads.push({ url, buffer: await fetchPayload(url) })

const server = http.createServer((req, res) => {
  const { buffer } = payloads[Number(req.headers['x-payload'])]
  const level = Number(req.headers['x-level'])
  compression({ threshold: 0, level: { brotli: level, gzip: level } })(req, res, () => {
    res.setHeader('content-type', 'text/plain')
    res.setHeader('content-length', buffer.length)
    Readable.from(toChunks(buffer)).pipe(res)
  })
})

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${server.address().port}`

const request = (payload, encoding, level) =>
  new Promise((resolve, reject) => {
    const req = http.get(origin, {
      headers: { 'accept-encoding': encoding, 'x-payload': payload, 'x-level': level }
    }, res => {
      if (res.headers['content-encoding'] !== encoding) reject(new Error(`expected ${encoding}, got ${res.headers['content-encoding']}`))
      let size = 0
      res.on('data', chunk => (size += chunk.length))
      res.on('end', () => resolve(size))
    })
    req.on('error', reject)
  })

const median = values => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = sorted.length >> 1
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

const measure = async (payload, encoding, level) => {
  const durations = []
  let size = 0
  const elapsed = timeSpan()
  while (durations.length < MIN_RUNS || (durations.length < MAX_RUNS && elapsed() < TIME_BUDGET_MS)) {
    const duration = timeSpan()
    size = await request(payload, encoding, level)
    durations.push(duration())
  }
  const serveMs = median(durations)
  const sendMs = size / bytesPerMs
  return { level, size, serveMs, sendMs, totalMs: serveMs + sendMs }
}

const withSlowdown = results => {
  const fastest = Math.min(...results.map(result => result.totalMs))
  return results.map(result => {
    const slowdown = Math.max(0, result.totalMs - fastest - NOISE_FLOOR_MS) / fastest
    return { ...result, slowdown, keepsUp: slowdown <= margin }
  })
}

const resultAt = ({ results }, level) => results.find(result => result.level === level)

const worstSlowdown = (runs, level) => Math.max(...runs.map(run => resultAt(run, level).slowdown))

const pct = value => `${(value * 100).toFixed(1)}%`

console.log(`\n${mbps} Mbps, slowdown is the extra time over the fastest level beyond ${NOISE_FLOOR_MS}ms, and a level keeps up when it stays within ${pct(margin)}\n`)

for (const { name, encoding, levels } of ALGORITHMS) {
  const runs = []
  for (const [index, { url, buffer }] of payloads.entries()) {
    const results = []
    for (const level of levels) results.push(await measure(index, encoding, level))
    runs.push({ url, buffer, results: withSlowdown(results) })
  }

  for (const { url, buffer, results } of runs) {
    console.log(`${name} ${url} (${buffer.length} bytes)`)
    console.log('level\tratio\tserve\t\tsend\t\ttotal\t\tslowdown')
    for (const { level, size, serveMs, sendMs, totalMs, slowdown, keepsUp } of results) {
      console.log(
        `${level}\t${(buffer.length / size).toFixed(2)}x\t${serveMs.toFixed(2)}ms\t\t${sendMs.toFixed(2)}ms\t\t${totalMs.toFixed(2)}ms\t\t${pct(slowdown)}${keepsUp ? '\tkeeps up' : ''}`
      )
    }
    console.log()
  }

  const preferred = levels.filter(level => runs.every(run => resultAt(run, level).keepsUp)).at(-1)
  const closest = levels.reduce((best, level) => (worstSlowdown(runs, level) < worstSlowdown(runs, best) ? level : best))

  console.log(preferred === undefined
    ? `preferred ${name} level: none keeps up on every payload; ${closest} has the lowest worst-case slowdown (${pct(worstSlowdown(runs, closest))})\n`
    : `preferred ${name} level: ${preferred} (worst-case slowdown ${pct(worstSlowdown(runs, preferred))})\n`)
}

server.close()
