module.exports = class Tasks {
  constructor (client) {
    this.client = client
  }

  get executions () { return this.client.executions }

  get running () { return [] }
  get complete () { return [] }
}
