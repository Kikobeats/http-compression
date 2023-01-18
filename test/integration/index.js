'use strict'

const http = require('http')
const test = require('ava')

const compression = require('../..')
const { get, listen } = require('../util')

test('works fine calling `res.statusCode`', async t => {
  const handler = (req, res) => {
    res.statusCode = 201
    res.end('hello world')
  }

  const server = http.createServer((req, res) =>
    compression({ threshold: 0 })(req, res, () => handler(req, res))
  )

  const serverUrl = await listen(server)
  t.teardown(() => server.close())

  const { res, data } = await get(serverUrl, {
    headers: {
      'accept-encoding': 'br'
    }
  })

  t.is(res.headers['content-encoding'], 'br')
  t.is(res.statusCode, 201)
  t.is(data.toString(), 'hello world')
})

test('works fine calling `res.writeHead`', async t => {
  const handler = (req, res) => {
    res.writeHead(201)
    res.end('hello world')
  }

  const server = http.createServer((req, res) =>
    compression({ threshold: 0 })(req, res, () => handler(req, res))
  )

  const serverUrl = await listen(server)
  t.teardown(() => server.close())

  const { res, data } = await get(serverUrl, {
    headers: {
      'accept-encoding': 'br'
    }
  })

  t.is(res.headers['content-encoding'], 'br')
  t.is(res.statusCode, 201)
  t.is(data.toString(), 'hello world')
})
