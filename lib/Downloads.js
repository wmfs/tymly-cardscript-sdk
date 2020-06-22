function tymlyUrl (client) {
  if (client.options.tymlyUrl) {
    return client.options.tymlyUrl
  }

  const apiUrl = client.options.tymlyApiUrl
  const lastSlash = apiUrl.lastIndexOf('/')
  return `${apiUrl.substring(0, lastSlash)}`
} // tymlyUrl

module.exports = class Downloads {
  constructor (client) {
    this.tymlyUrl = tymlyUrl(client)
  }

  immediateDownload (ctx) {
    const { immediateDownload, downloadPath } = ctx
    return immediateDownload ? this.downloadUrl(downloadPath) : null
  } // immediateDownload

  downloadUrl (downloadPath) {
    return `${this.tymlyUrl}${downloadPath}`
  } // downloadUrl
} // Downloads
