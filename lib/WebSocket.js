class _WebSocket {
  constructor (client) {
    this.store = client.options.store
    this.token = client.options.auth.token
    this.ws = this.store.state.app.ws
    this.connect()
  }

  get url () {
    let url = process.env.TYMLY_API_BASE_URL.replace(/^http/, 'ws')
    if (url[url.length - 1] !== '/') url += '/'

    const headers = {
      authorization: 'Bearer ' + this.token
    }

    const params = [
      `headers=${JSON.stringify(headers)}`
    ]

    return url + `?${params.join('&')}`
  }

  subscribe (subscriptions) {
    this.connect()
    this.ws.send(JSON.stringify({ event: 'subscribe', subscriptions }))
  }

  unsubscribe (subscriptions) {
    this.connect()
    this.ws.send(JSON.stringify({ event: 'unsubscribe', subscriptions }))
  }

  connect () {
    if (this.ws) return

    console.log('Opening websocket connection')

    this.ws = new WebSocket(this.url)
    this.ws.onopen = event => {
      this.ws.onmessage = msg => {
        // do not update if came from same source - msg.srcElement?

        let event = ''
        let message = {}

        try {
          const obj = JSON.parse(msg.data)
          event = obj.key
          message = obj.message
        } catch (e) { }

        this.store.commit('app/wsMessage', { event, message })
      }
    }
    this.store.commit('app/ws', this.ws)
  }

  disconnect () {
    if (this.ws === null) return

    console.log('Closing websocket connection')
    this.ws.close()
    this.ws = null
    this.store.commit('app/ws', this.ws)
  }
}

module.exports = _WebSocket
