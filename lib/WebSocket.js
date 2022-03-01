class _WebSocket {
  constructor (client) {
    this.userId = client.auth.sub
    this.store = client.options.store

    this.ws = this.store.state.app.ws
  }

  get url () {
    let url = process.env.TYMLY_API_BASE_URL.replace(/^http/, 'ws')
    if (url[url.length - 1] !== '/') url += '/'

    const params = [
      `subscriptions=${encodeURIComponent(Object.keys(this.store.state.app.subscriptions))}`,
      `userId=${encodeURIComponent(this.userId)}`
    ]

    url += `?${params.join('&')}`
    return url
  }

  subscribe (subs) {
    if (!Array.isArray(subs) || subs.length === 0) {
      console.log('Nothing to subscribe to')
      return
    }

    for (const { event } of subs) {
      this.store.commit('app/subscribe', event)
    }

    this.connect()
  }

  unsubscribe (subs) {
    if (!Array.isArray(subs) || subs.length === 0) {
      console.log('Nothing to unsubscribe from')
      return
    }

    for (const { event } of subs) {
      this.store.commit('app/unsubscribe', event)
    }

    this.connect()
  }

  connect () {
    if (this.ws) return

    console.log('Opening websocket connection', this.url)
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

        this.store.commit('app/subscriptionUpdate', { event, message })
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
