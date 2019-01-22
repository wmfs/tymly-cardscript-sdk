const validator = require('@wmfs/cardscript-schema').validateForm
const quasarConverter = require('@wmfs/cardscript-to-quasar')
const extractDefaults = require('@wmfs/cardscript-extract-defaults')
const extractToc = require('@wmfs/cardscript-table-of-contents')
const extractLists = require('@wmfs/cardscript-extract-lists')
const sdk = require('@wmfs/cardscript-vue-sdk').default

module.exports = class Templates {
  constructor (client) {
    this.db = client.db
    this.store = client.options.store
  }

  async persistFromUserQuery (userQuery) {
    const { cards } = userQuery.add

    await this.db.cards.clear()

    for (const card of Object.values(cards)) {
      if (card.hasOwnProperty('type') && card.type === 'AdaptiveCard') {
        const processed = {
          ...card,
          ...processCardscript(card)
        }
        console.log('>>>>', processed)
        await this.db.cards.put(card)
      }
    }
  }

  async load () {
    // todo
    // this.db.templates[id] = { template, toc, lists... }
    const data = await this.db.cards.toArray()
    this.store.commit('app/cards', data)
  }

  unloadTemplates () {
    // todo
    // this.db.templates = {}
  }
}

function processCardscript (card) {
  const result = {}
  result.validatorOutput = validator(card)
  if (result.validatorOutput.elementsValid) {
    result.defaultValues = extractDefaults(card)
    result.toc = extractToc(card)
    result.lists = extractLists(card)
    result.defaultInternals = sdk.getDefaultInternals.default(card)
    result.defaultInternals.cardListDefaults = result.defaultValues.cardLists
    result.quasarOutput = quasarConverter(card)
  } else {
    throw new Error(`${result.validatorOutput.errors[0].property} ${result.validatorOutput.errors[0].message}`)
  }
  return result
}
