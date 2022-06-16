module.exports = class Startables {
  constructor (client) {
    this.db = client.db
    this.store = client.options.appStore
    this.executions = client.executions
    this.token = client.options.auth.token
  }

  /**
   * Function to store from user query to indexedDB
   * @param {Object} userQuery result of userQuery
   */
  async persistFromUserQuery (userQuery) {
    const startTime = Date.now()

    const _modified = new Date()

    const startablesToRemove = userQuery.remove.startable || []
    const startablesToAdd = userQuery.add.startable
      ? Object.values(userQuery.add.startable).map(s => {
          s._modified = _modified
          return s
        })
      : []

    if (startablesToRemove.length) await this.db.startables.bulkDelete(startablesToRemove)
    if (startablesToAdd.length) await this.db.startables.bulkPut(startablesToAdd)

    const { favouriteStartableNames } = userQuery
    await this.db.favourites.put({ id: 'favourites', favourites: favouriteStartableNames })

    console.log(`Persisted startables in ${Date.now() - startTime}ms`)
  }

  /**
   * Load startables from indexedDB to store
   @example
   await sdk.startables.load()
   */
  async load () {
    const startables = await this.db.startables.toArray()
    this.store.setStartables(startables)

    const rows = await this.db.favourites.get('favourites')

    if (rows) {
      this.store.setFavourites(rows.favourites)
    }
  }

  /**
   * Favourite a startable and persist where appropriate
   * @param {String} id ID of startable to mark as favourite
   @example
   await sdk.startables.favourite(id)
   */
  // todo: probably refactor these
  async favourite (id) {
    this.store.favourite(id)

    const { favourites } = await this.db.favourites.get('favourites')
    if (!favourites.includes(id)) favourites.push(id)

    await this.db.favourites.put({ id: 'favourites', favourites })
    await this.updateFavouritesOnServer(favourites)
  }

  /**
   * Unfavourite a startable and persist where appropriate
   * @param {String} id ID of startable to remove from favourites
   @example
   await sdk.startables.unfavourite(id)
   */
  async unfavourite (id) {
    this.store.unfavourite(id)

    const { favourites } = await this.db.favourites.get('favourites')

    const index = favourites.indexOf(id)
    if (index > -1) favourites.splice(index, 1)

    await this.db.favourites.put({ id: 'favourites', favourites })
    await this.updateFavouritesOnServer(favourites)
  }

  /**
   * execute setFavouriteStartableNames state machine to persist favourites state to backend DB
   * @param {Object} favourites Favourites object to persist to the server
   @example
   await sdk.startables.updateFavouritesOnServer(favourites)
   */
  updateFavouritesOnServer (favourites) {
    return this.executions.execute({
      stateMachineName: 'tymly_setFavouriteStartableNames_1_0',
      input: {
        stateMachineNames: favourites
      },
      token: this.token
    })
  }
}
