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

Type: `object`<br>
Default: `{ brotli: 2, gzip: 2 }`

The compression effort/level/quality setting, used by both Gzip and Brotli. The scale range is:

- brotli: from 0 to 11.
- gzip: from -1 to 9.

The defaults are the highest levels that stay within 3% (plus 0.05ms of timer noise) of the fastest level on every payload tried. The [benchmark](benchmark/index.mjs) serves each payload through this middleware and adds the time to send the compressed body at 100 Mbps. The payloads were HTML (794kB), Markdown (190kB), JavaScript (546kB), a JSON API response (4.2MB) and a small JSON one (2kB). Brotli 2 and gzip 2 were picked in 6 of 7 runs. Brotli 3 sits at the edge of run-to-run noise on the large JSON, 2.9% to 4.2% slower than brotli 2. Over a faster link the cheapest levels win, and over a slower one higher levels do. A level you leave out keeps its default.

Pick levels for your own traffic with the [benchmark](benchmark/index.mjs):

```
node benchmark/index.mjs --mbps=100 https://example.com/page.html https://example.com/api.json
```

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

> [kikobeats.com](https://kikobeats.com) · GitHub [Kiko Beats](https://github.com/Kikobeats) · X [@Kikobeats](https://x.com/Kikobeats)
