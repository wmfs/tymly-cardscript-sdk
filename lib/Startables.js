module.exports = class Startables {
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
    const startablesToAdd = userQuery.add.startable || {}
    const startablesToRemove = userQuery.remove.startable || []

    await Promise.all(
      startablesToRemove.map(this.db.startables.delete)
    )

    await Promise.all(
      Object.values(startablesToAdd).map(startable => {
        startable._modified = new Date()
        return this.db.startables.put(startable)
      })
    )

    const { favouriteStartableNames } = userQuery
    await this.db.favourites.put({ id: 'favourites', favourites: favouriteStartableNames })
  }

  /**
   * Load startables from indexedDB to store
    @example
      await sdk.startables.load()
   */
  async load () {
    const startables = await this.db.startables.toArray()
    this.store.commit('app/startables', startables)
    const rows = await this.db.favourites.get('favourites')
    if (rows) {
      this.store.commit('app/favourites', rows.favourites)
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
    this.store.commit('app/favourite', id)

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
    this.store.commit('app/unfavourite', id)

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
