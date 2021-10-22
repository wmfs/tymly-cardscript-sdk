const log = msg => console.log(`[${new Date().toISOString()}] ${msg}`)

class Stopwatch {
  constructor () {
    this.times = [
      {
        label: 'init',
        milliseconds: Date.now()
      }
    ]
  }

  addTime (label) {
    log(label)
    const previousTime = this.times[this.times.length - 1]
    const n = Date.now()
    previousTime.duration = n - previousTime.milliseconds
    this.times.push({ label, milliseconds: n })
  }

  getResults () {
    const trimmed = this.times.slice(1, -1)
    let total = 0
    trimmed.forEach(time => { total += time.duration })
    trimmed.forEach(time => { time.percentage = ((time.duration / total) * 100).toFixed(1) })
    return trimmed
  }

  getTotal () {
    return this.times
      .map(time => time.duration || 0)
      .reduce((acc, time) => acc + time)
  }
}

module.exports = Stopwatch
