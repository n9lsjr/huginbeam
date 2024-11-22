# huginbeam

A 1-1 end-to-end encrypted internet pipe powered by [Hyperswarm-hugin](https://www.npmjs.com/package/hyperswarm-hugin) and Noise

```
npm install huginbeam
```

## Usage

```js
const Huginbeam = require("huginbeam");


## API

#### `const stream = new Huginbeam([key][, options])`

Make a new Huginbeam duplex stream.

Will auto connect to another peer using the same key with an end to end encrypted tunnel.

When the other peer writes it's emitted as `data` on this stream.

Likewise when you write to this stream it's emitted as `data` on the other peers stream.

You will need to pass a `key` into the constructor (the passphrase)

`options(mandatory)` include:

- `upload`
- `dht_keys` A random keypair
- `base_keys` A base keypair generated from key
- `sig` A signature generated from base_keys

#### `beam.key`

The passphrase used by the stream for connection.

## License

MIT
```
