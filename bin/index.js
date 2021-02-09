#!/usr/bin/env node

// require imports => move into individual controllers later on when utilizing webpack
const chalk = require('chalk')
const boxen = require('boxen')
const yargs = require('yargs')
const axios = require('axios')
const { string } = require('yargs')


const options = yargs
  .usage('Usage: -n <name>')
  .option('n', { alias: 'name', describe: 'Your name', type: 'string' }) // , demandOption: true
  .option('s', { alias: 'search', describe: 'Search term', type: 'string' })
  .option('check-task-status', { describe: 'Check all tasks for status', type: 'string' })
  .argv

// let greeting = chalk.white.bold(`Hello, ${options.name || 'Stranger'}!`)

// const boxenOptions = {
//   padding: 1,
//   margin: 1,
//   borderStyle: 'round',
//   borderColor: 'green'
// }
// const msgBox = boxen(greeting, boxenOptions)

// console.log(msgBox)

if (options.search) {
  findJoke(options.search)
}

console.log(options)

if (options.checkTaskStatus === '') {
  console.log('looking for tasks')
  axios.get(`https://api.groupclaes.be/tasks`, { headers: { Accept: 'application/json' } })
    .then(function (res) {
      console.log(res)

      validateAllTasks(res.data)
    })
    .catch(function (err) {
      console.error(err)
    })
}

function findJoke(query) {
  console.log(`Searching for jokes about ${query}...`)

  // The url depends on searching or not
  const url = `https://icanhazdadjoke.com/search?term=${escape(query)}`

  axios.get(url, { headers: { Accept: 'application/json' } })
    .then(res => {
      if (options.search) {
        // if searching for jokes, loop over the results
        res.data.results.forEach(j => {
          console.log('\n' + j.joke)
        })
        if (res.data.results.length === 0) {
          console.log('no jokes found :\'(')
        }
      } else {
        console.log(res.data.joke)
      }
    })
}

function validateAllTasks(tasks) {
  tasks.forEach(async function (task) {
    const result = validateTask(task)

    switch (result) {
      case 'ok':
        console.log(`Task: ${task.TaskName} has status OK`)
        break

      case 'failed':
        // set task to 4 since alert will be send
        // await api.setTaskStatus(task.Id, '4')
        console.warn(`${task.TaskName} has entered the failed state!\n${task.Responsible} please take action!`)
        break

      case 'err: overtime':
        console.warn(`${task.TaskName} is still running!\n${task.Responsible} please take action!`)
        break

      case 'err: task-not-started':
        console.warn(`${task.TaskName} has not started!\n${task.Responsible} please take action!`)
        break

      case 'err: status-unknow':
        console.warn(`${task.TaskName} is in an unknown state!\n${task.Responsible} please take action!`)
        break

      case 'err: confused':
        console.warn(`Homer is confused??`)
        break

      default:
        console.warn(`Task verify has finished in an unknown state.`)
        break
    }
  })
}

function validateTask(task) {
  const now = new Date(new Date().getTime())
  let lastRun = new Date() // last time the schedule has started
  if (task.LastRun !== undefined && task.LastRun !== null) {
    lastRun = new Date(new Date(task.LastRun).getTime())
  }

  switch (task.Status) {
    case -1:
    case 0:
      // console.log(`'task' ${task.Id}, 'status is either disabled or has never ran yet.'`, { severity: 7 })
      return 'ok'

    case 1: // task is running
      // check if the task has been running to long
      if ((lastRun.getTime() + ((task.NormalDuration + 1) * 60000)) <= now.getTime()) {
        // the task has been running too long.
        return 'err: overtime'
      }
      return 'ok' // otherwise the task is probably doing fine.

    case 2: // task is ok
      const firstRun = new Date(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() + task.StartTime * 60000)

      if (task.LastRun) {
        let currentSchedule = new Date(firstRun)

        // check if the task has an interval, if so calculate the currently planned start time
        if (task.Interval > 0) {
          // task has an interval => find current interval
          while (new Date(currentSchedule.getTime() + (task.Interval * 60000)) <= now) {
            currentSchedule = new Date(currentSchedule.getTime() + (task.Interval * 60000))
          }
        }


        if (!task.Weekend && (now.getDay() == 0 || now.getDay() == 6)) {
          // if task should not run in weekend and today is weekend, return true.
          // console.log(`'task' ${task.Id}, 'if task should not run in weekend and today is weekend, return true.'`)
          return 'ok'
          // offset by one minute to check single run
        } else if (lastRun && new Date(lastRun.getTime() + 60000) > firstRun && task.Interval == 0) {
          // task only runs once and is on schedule
          // console.log(`'task' ${task.Id}, 'task only runs once and is on schedule, timing ok.'`)
          return 'ok'
        } else if (now < firstRun) {
          // do nothing since the schedule is not suposed to run before this.
          // console.log(`'task' ${task.Id}, 'do nothing since the schedule is not suposed to run before this.'`)
          return 'ok'
        } else if (now > currentSchedule) {
          let endRun = new Date()
          if (task.EndTime != null) {
            endRun = new Date(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() + task.EndTime * 60000)
          }
          // console.log(`'task' ${task.Id}, 'currentSchedule', ${currentSchedule}, 'now', ${now}, 'firstRun', ${firstRun}, 'lastRun', ${lastRun}, 'endtime', ${endRun}`)

          // check if the schedule started as planned
          if (lastRun >= currentSchedule) {
            // schedule has started as planned.
            // console.log(`'task' ${task.Id}, 'schedule has started as planned.'`)
            return 'ok'
          } else if (task.EndTime != null && currentSchedule > endRun) {
            // endtime is defined and shedule is after endtime => ignore
            // console.log(`'task' ${task.Id}, 'endtime is defined and shedule is after endtime => ignore.'`)
            return 'ok'
          } else if (now <= new Date(currentSchedule.getTime() + 60000)) {
            // schedule has 1 minute to start as planned.
            // console.log(`'task' ${task.Id}, 'schedule has 1 minute to start as planned.'`)
            return 'ok'
          } else {
            // return 'ok';
            return 'err: task-not-started'
          }
        } else {
          console.log(`'task' ${task.Id}, 'I have no fucking clue'`)
          return 'ok'
        }
      } else {
        // task has never run but status is set, call in for I am comfusion
        return 'err: confused'
      }

    case 3: // task in in error status
      return 'failed'

    case 4: // alert should've has already been send, pretend everything is fine.
      return 'ok'

    default:
      return 'err: status-unknow'
  }
}