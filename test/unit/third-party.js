'use strict'

const onHeaders = require('on-headers')
const test = require('ava')

const { get, runServer } = require('../util')
const compression = require('../../src')

test('play nice with `on-headers`', async t => {
  const handler = (req, res) => {
    onHeaders(res, () => res.setHeader('x-powered-by', 'Node.js'))
    res.statusCode = 201
    res.end('hello world')
  }

  const url = await runServer(t, (req, res) =>
    compression({ threshold: 0 })(req, res, () => handler(req, res))
  )

  const { res } = await get(url, {
    headers: {
      'accept-encoding': 'gzip'
    }
  })

  t.is(res.headers['x-powered-by'], 'Node.js')
})
