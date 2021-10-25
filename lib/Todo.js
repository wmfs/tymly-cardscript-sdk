module.exports = class Todo {
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
    this.executions = client.executions
    this.token = client.options.auth.token
  }

  /**
   * Function to store from user query to indexedDB
   * @param {Object} userQuery result of userQuery
   */
  async persistFromUserQuery (userQuery) {
    const startTime = Date.now()

    const todosToAdd = userQuery.add.todos || {}
    const todosToRemove = userQuery.remove.todos || []

    await Promise.all(todosToRemove.map(t => this.db.todo.delete(t)))
    await Promise.all(Object.values(todosToAdd).map(t => this.db.todo.put(t)))

    console.log(`Persisted todos in ${Date.now() - startTime}ms`)
  }

  /**
   * Load templates from indexedDB to store
   @example
   await sdk.todo.load()
   */
  async load () {
    const data = await this.db.todo.toArray()
    this.store.commit('app/todos', data)
  }

  /**
   * Remove a Todo
   * @param {String} id ID of Todo to remove
   * @example
   *  sdk.todo.remove(todoID)
   */
  remove (id) {
    return this.executions.execute({
      stateMachineName: 'tymly_removeTodoEntries_1_0',
      input: {
        todoId: id
      },
      token: this.token
    })

    // todo
    // remove from db
    // remove from store
    // although the tests just refresh user query and that does the job
  }

  /**
   * Load Todos from indexedDB and add to store
   * @param {Object} options Object describing offset/limit/filter
   * @example
   *  sdk.todo.loadTodos({
   *    offset = 0,
   *    limit = 10,
   *    filter = ''
   *  })
   */
  loadTodos (options) {
    // todo
    // const { offset, limit, filter } = options
    // get from this.db
    // add result to vuex this.store
  }

  /**
   * Get any changes to Todos stored locally
   * @example
   *  sdk.todo.refreshTodos()
   */
  refreshTodos () {
    return this.executions.execute({
      stateMachineName: 'tymly_getTodoChanges_1_0',
      input: {
        clientTodos: []
      },
      token: this.token
    })
  }
}
