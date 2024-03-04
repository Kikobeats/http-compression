# http-compression

![Last version](https://img.shields.io/github/tag/Kikobeats/http-compression.svg?style=flat-square)
[![Coverage Status](https://img.shields.io/coveralls/Kikobeats/http-compression.svg?style=flat-square)](https://coveralls.io/github/Kikobeats/http-compression)
[![NPM Status](https://img.shields.io/npm/dm/http-compression.svg?style=flat-square)](https://www.npmjs.org/package/http-compression)

**http-compression** adds compression for your HTTP server in Node.js by:

- No dependencies (< 1kB).
- Express style middleware support.
- Auto detect the best encoding to use (gzip/brotli).

## Install

```bash
$ npm install http-compression --save
```

## Usage

If you are using an Express style framework, you can add it as middlware:

```js
const compression = require('http-compression')
const express = require('express')

express()
  .use(compression({ /* see options below */ }))
  .use((req, res) => {
    // this will get compressed:
    res.end('hello world!'.repeat(1000))
  })
  .listen(3000)
```

Otherwise, just pass `req, res` primitives to it:

```js
const compression = require('http-compression')({ /* see options below */ })
const { createServer } = require('http')

const server = createServer((req, res) => {
  compression(req, res)
  res.end('hello world!'.repeat(1000))
})

server.listen(3000, () => {
  console.log('> Listening at http://localhost:3000')
})
```

## API

The `compression(options)` function returns an Express style middleware of the form `(req, res, next)`.

### Options

#### threshold

Type: `Number`<br>
Default: `1024`

Responses below this threshold (in bytes) are not compressed. The default value of `1024` is recommended, and avoids sharply diminishing compression returns.

#### level

Type: `Number`<br>
Default: `-1`

The compression effort/level/quality setting, used by both Gzip and Brotli. The scale ranges from 1 to 11, where lower values are faster and higher values produce smaller output. The default value of `-1` uses the default compression level as defined by Gzip (6) and Brotli (6).

#### brotli

Type: `boolean`<br>
Default: `true`

Enables response compression using Brotli for requests that support it. as determined by the `Accept-Encoding` request header.

#### gzip

Type: `boolean`<br>
Default: `true`

Enables response compression using Gzip for requests that support it, as determined by the `Accept-Encoding` request header.

#### mimes

Type: `RegExp`<br>
Default: `/text|javascript|\/json|xml/i`

The `Content-Type` response header is evaluated against this Regular Expression to determine if it is a MIME type that should be compressed.
Remember that compression is generally only effective on textual content.

## License

Thanks to [developit](https://github.com/developit) for written the original code implementation for [polka#148](https://github.com/lukeed/polka/pull/148).

**http-compression** © [Kiko Beats](https://kikobeats.com), released under the [MIT](https://github.com/Kikobeats/http-compression/blob/master/LICENSE.md) License.<br>
Authored and maintained by [Kiko Beats](https://kikobeats.com) with help from [contributors](https://github.com/Kikobeats/http-compression/contributors).

> [kikobeats.com](https://kikobeats.com) · GitHub [Kiko Beats](https://github.com/Kikobeats) · Twitter [@Kikobeats](https://twitter.com/Kikobeats)
