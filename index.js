const { Duplex } = require('streamx')
const queueTick = require('queue-tick')
const Hyperswarm = require('hyperswarm-hugin')

module.exports = class Huginbeam extends Duplex {
  constructor (key, options) {
    super()
    this.sig = options.sig
    this.base_keys = options.base_keys
    this.dht_keys = options.dht_keys
    this.topic = this.base_keys.publicKey
    this.key = key
    this.upload = options.upload
    this._node = null
    this._server = null
    this._out = null
    this._inc = null
    this._now = Date.now()
    this._ondrain = null
    this._onopen = null
    this._onread = null
  }

  get connected () {
    return !!this._out
  }

  _ondrainDone (err) {
    if (this._ondrain) {
      const cb = this._ondrain
      this._ondrain = null
      cb(err)
    }
  }

  _onreadDone (err) {
    if (this._onread) {
      const cb = this._onread
      this._onread = null
      cb(err)
    }
  }

  _onopenDone (err) {
    if (this._onopen) {
      const cb = this._onopen
      this._onopen = null
      cb(err)
    }
  }

  async _open (cb) {

    this._onopen = cb

    const onConnection = s => {
      s.on('data', (data) => {
        if (!this._inc) {
          this._inc = s
          this._inc.on('error', (err) => this.destroy(err))
          this._inc.on('end', () => this._push(null))
        }

        if (s !== this._inc) return
        if (this._push(data) === false) s.pause()
      })

      s.on('end', () => {
        if (this._inc) return
        this._push(null)
      })

      if (!this._out) {
        this._out = s
        this._out.on('error', (err) => this.destroy(err))
        this._out.on('drain', () => this._ondrain(null))
        this.emit('connected')
        this._onopenDone(null)
      }
    }

    if (this.upload) {
      this._server = new Hyperswarm({maxPeers: 1}, this.sig, this.dht_keys, this.base_keys)
      this._server.on('connection', onConnection)
      try {
        await this._server.join(this.topic, {server: true, client: true})
      } catch (err) {
        this._onopenDone(err)
        return
      }
      return
    } else {
      this._node = new Hyperswarm({maxPeers: 1}, this.sig, this.dht_keys, this.base_keys)
      await this._node.join(this.topic, {server: true, client: true})
      this._node.on('connection', async (connection) => {
        onConnection(connection)
        try {
          await new Promise((resolve, reject) => {
            connection.once('open', resolve)
            connection.once('close', reject)
            connection.once('error', reject)
          })
        } catch (err) {
          this._onopenDone(err)
          return
        }
        })
      }
    }
    



  _read (cb) {
    this._onread = cb
    if (this._inc) this._inc.resume()
  }

  _push (data) {
    const res = this.push(data)
    queueTick(() => this._onreadDone(null))
    return res
  }

  _write (data, cb) {
    if (this._out.write(data) !== false) return cb(null)
    this._ondrain = cb
  }

  _final (cb) {
    const done = () => {
      this._out.removeListener('finish', done)
      this._out.removeListener('error', done)
      cb(null)
    }

    this._out.end()
    this._out.on('finish', done)
    this._out.on('error', done)
  }

  _predestroy () {
    if (this._inc) this._inc.destroy()
    if (this._out) this._out.destroy()
    const err = new Error('Destroyed')
    this._onopenDone(err)
    this._onreadDone(err)
    this._ondrainDone(err)
  }

  async _destroy (cb) {
    if (!this._node) return cb(null)
    if (this._server) await this._server.destroy().catch(e => undefined)
    await this._node.destroy().catch(e => undefined)
    cb(null)
  }
}

