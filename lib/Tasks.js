module.exports = class Tasks {
  constructor (client) {
    this.client = client
    this.store = client.options.store
  }

  async update () {
    const executionDescription = await this.executions.execute({
      stateMachineName: 'tymly_listLongRunningTasks_1_0',
      input: { },
      sendResponse: 'COMPLETE'
    })

    if (executionDescription.status === 'SUCCEEDED') {
      this.tasks = executionDescription.ctx
    }

    return this.tasks
  }

  get executions () { return this.client.executions }
  get db () { return this.client.db }

  async getByLocalState () {
    const running = await this.db.tasksRunning.toArray()
    const complete = await this.db.tasksComplete.toArray()

    return {
      RUNNING: running,
      COMPLETE: complete
    }
  }

  get running () { return this.store.state.app.tasks.running }
  get complete () { return this.store.state.app.tasks.complete }

  async persistFromUserQuery ({ tasks }) {
    const { running, complete } = tasks

    const updateDb = async (array, dbTable) => {
      await dbTable.clear()
      for (const task of array) {
        await dbTable.put({
          executionName: task.executionName,
          executionTitle: task.title,
          stateMachineName: task.stateMachineName,
          startDate: task.created,
          updateDate: task.modified
        })
      }
    }

    await updateDb(running, this.db.tasksRunning)
    await updateDb(complete, this.db.tasksComplete)
  }

  async load () {
    const tasksRunning = await this.db.tasksRunning.toArray()
    const tasksComplete = await this.db.tasksComplete.toArray()

    this.store.commit('app/tasks', {
      running: tasksRunning,
      complete: tasksComplete
    })
  }
}
