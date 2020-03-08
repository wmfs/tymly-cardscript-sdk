module.exports = class Tasks {
  constructor (client) {
    this.client = client
    this.tasks = {
      running: [],
      complete: []
    }
  }

  async update(authToken) {
    const executionDescription = await this.executions.execute({
      stateMachineName: 'tymly_listLongRunningTasks_1_0',
      input: { },
      sendResponse: 'COMPLETE',
      token: authToken
    })

    if (executionDescription.status === 'SUCCEEDED') {
      this.tasks = executionDescription.ctx
    }
  }

  get executions () { return this.client.executions }

  get running () { return this.tasks.running }
  get complete () { return this.tasks.complete }
}
