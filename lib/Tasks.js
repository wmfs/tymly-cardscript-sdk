module.exports = class Tasks {
  constructor (client) {
    this.client = client
    this.store = client.options.appStore
  }

  async updateAndPersist () {
    const tasks = await this.update()
    await this.persistFromUserQuery({ tasks })
    return this.getByLocalState()
  }

  async update () {
    const executionDescription = await this.run_(
      'tymly_listLongRunningTasks_1_0'
    )

    if (executionDescription.status === 'SUCCEEDED') {
      this.tasks = executionDescription.ctx
    }

    return this.tasks
  }

  async archive (executionName) {
    await this.run_(
      'tymly_archiveExecution_1_0',
      { executionName }
    )

    this.updateAndPersist()
  }

  run_ (stateMachine, input = {}) {
    return this.executions.execute({
      stateMachineName: stateMachine,
      input,
      sendResponse: 'COMPLETE'
    })
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

  get running () { return this.store.tasks.running }
  get complete () { return this.store.tasks.complete }

  async persistFromUserQuery ({ tasks }) {
    const startTime = Date.now()

    const { running, complete } = tasks

    const updateDb = async (array, dbTable) => {
      await dbTable.clear()
      if (array.length) {
        await dbTable.bulkPut(array.map(task => {
          return {
            executionName: task.executionName,
            executionTitle: task.title,
            stateMachineName: task.stateMachineName,
            startDate: task.created,
            updateDate: task.modified
          }
        }))
      }
    }

    await updateDb(running, this.db.tasksRunning)
    await updateDb(complete, this.db.tasksComplete)

    console.log(`Persisted tasks in ${Date.now() - startTime}ms`)
  }

  async load () {
    const running = await this.db.tasksRunning.toArray()
    const complete = await this.db.tasksComplete.toArray()

    this.store.setTasks({ running, complete })
  }
}
