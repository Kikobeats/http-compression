'use strict'

const zlib = require('zlib')

const MIMES = /text|javascript|\/json|xml/i

const noop = () => {}

const getChunkSize = (chunk, enc) => (chunk ? Buffer.byteLength(chunk, enc) : 0)

/**
 * @param {object} [options]
 * @param {number} [options.threshold = 1024] Don't compress responses below this size (in bytes)
 * @param {object} [options.level = { brotli: 1, gzip: 7 }] - Compression effort levels for Brotli and Gzip.
 * @param {boolean} [options.brotli = true] Generate and serve Brotli-compressed responses
 * @param {boolean} [options.gzip = true] Generate and serve Gzip-compressed responses
 * @param {RegExp} [options.mimes] Regular expression of response MIME types to compress (default: text|javascript|json|xml)
 * @returns {(req: Pick<import('http').IncomingMessage, 'method'|'headers'>, res: import('http').ServerResponse, next?:Function) => void}
 * @return Express style middleware
 */
module.exports = ({
  threshold = 1024,
  level = { brotli: 0, gzip: 1 },
  brotli = true,
  gzip = true,
  mimes = MIMES
} = {}) => {
  const brotliOpts = (typeof brotli === 'object' && brotli) || {}
  const gzipOpts = (typeof gzip === 'object' && gzip) || {}

  if (brotli && !zlib.createBrotliCompress) brotli = false

  return (req, res, next = noop) => {
    const accept = req.headers['accept-encoding']
    const encoding =
      accept &&
      ((brotli && accept.match(/\bbr\b/)) ||
        (gzip && accept.match(/\bgzip\b/)) ||
        [])[0]

    if (req.method === 'HEAD' || !encoding) return next()

    let compress
    let pendingStatus
    let pendingListeners = []
    let started = false
    let size = 0

    function start () {
      started = true
      size = res.getHeader('Content-Length') | 0 || size
      const compressible = mimes.test(
        String(res.getHeader('Content-Type') || 'text/plain')
      )
      const cleartext = !res.getHeader('Content-Encoding')
      const listeners = pendingListeners || []
      if (compressible && cleartext && size >= threshold) {
        res.setHeader('Content-Encoding', encoding)
        res.removeHeader('Content-Length')
        if (encoding === 'br') {
          compress = zlib.createBrotliCompress({
            params: Object.assign({
              [zlib.constants.BROTLI_PARAM_QUALITY]: level.brotli,
              [zlib.constants.BROTLI_PARAM_SIZE_HINT]: size
            }, brotliOpts)
          })
        } else {
          compress = zlib.createGzip(Object.assign({ level: level.gzip }, gzipOpts))
        }
        // backpressure
        compress.on(
          'data',
          chunk => write.call(res, chunk) === false && compress.pause()
        )
        on.call(res, 'drain', () => compress.resume())
        compress.on('end', () => end.call(res))
        listeners.forEach(p => compress.on.apply(compress, p))
      } else {
        pendingListeners = null
        listeners.forEach(p => on.apply(res, p))
      }

      writeHead.call(res, pendingStatus || res.statusCode)
    }

    const { end, write, on, writeHead } = res

    res.writeHead = function (status, reason, headers) {
      if (typeof reason !== 'string') [headers, reason] = [reason, headers]
      if (headers) for (const i in headers) res.setHeader(i, headers[i])
      pendingStatus = status
      return this
    }

    res.write = function (chunk, enc) {
      size += getChunkSize(chunk, enc)
      if (!started) start()
      if (!compress) return write.apply(this, arguments)
      return compress.write.apply(compress, arguments)
    }

    res.end = function (chunk, enc) {
      if (arguments.length > 0 && typeof chunk !== 'function') {
        size += getChunkSize(chunk, enc)
      }
      if (!started) start()
      if (!compress) return end.apply(this, arguments)
      return compress.end.apply(compress, arguments)
    }

    res.on = function (type, listener) {
      if (!pendingListeners || type !== 'drain') on.call(this, type, listener)
      else if (compress) compress.on(type, listener)
      else pendingListeners.push([type, listener])
      return this
    }

    next()
  }
}
