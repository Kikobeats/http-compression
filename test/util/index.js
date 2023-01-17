const { ServerResponse } = require('http')

// IncomingMessage
class Request {
  constructor (method = 'GET', headers = {}) {
    this.method = method.toUpperCase()
    this.headers = {}
    for (const i in headers) this.headers[i.toLowerCase()] = headers[i]
  }
}

const ENCODING = {
  gzip: 'gzip, deflate',
  br: 'br, gzip, deflate'
}

class Response extends ServerResponse {
  constructor (req) {
    super(req)
    this._chunks = []
    this.done = new Promise(resolve => (this._done = resolve))
  }

  /** @param chunk @param [enc] @param [cb] */
  write (chunk, enc, cb) {
    if (!Buffer.isBuffer(chunk)) chunk = Buffer.from(chunk, enc)
    this._chunks.push(chunk)
    if (cb) cb(null)
    return true
  }

  /** @param chunk @param [enc] @param [cb] */
  end (chunk, enc, cb) {
    if (chunk) this.write(chunk, enc)
    if (cb) cb()
    this._done(Buffer.concat(this._chunks))
  }

  getResponseData () {
    return this.done
  }

  async getResponseText () {
    return (await this.done).toString()
  }
}

const prepare = (method, encoding) => {
  const req = new Request(method, {
    'Accept-Encoding': ENCODING[encoding] || encoding
  })
  const res = new Response(req)
  return { req, res }
}

const toAscii = input =>
  JSON.stringify(Buffer.from(input).toString('ascii')).replace(/(^"|"$)/g, '')

module.exports = { prepare, toAscii }
