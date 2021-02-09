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

if (options.checkTaskStatus === '') {
  axios.get(`https://api.groupclaes.be/tasks`, { headers: { Accept: 'application/json' } })
    .then(function (res) {
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

/**
 * Validate all tasks in Task Array
 * @param {Task[]} tasks
 */
function validateAllTasks(tasks) {
  tasks.forEach(async function (task) {
    const result = validateTask(task)

    switch (result) {
      case 'ok':
        console.log(`Task: ${task.TaskName} has status OK`)
        break

      case 'failed':
      case 'err: overtime':
      case 'err: task-not-started':
      case 'err: status-unknow':
        // set task to 4 since alert will be send
        await setTaskStatus(task.Id, '4')
        console.warn(`${task.TaskName} has state: ${result.substring(4)}!\n${task.Responsible} please take action!`)
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
      const firstRun = calculateTaskTime(task.StartTime)

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
            endRun = calculateTaskTime(task.EndTime)
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

function calculateTaskTime(time) {
  return new Date(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() + time * 60000)
}

function setTaskStatus(id, status) {
  return axios.get(`https://api.groupclaes.be/tasks/${id}/status?status=${status}`, { headers: { Accept: 'application/json' } })
}
/**
 * Class definition for task
 * @class Task
 */
class Task {
  /**
   * Id of the task
   * @type {number}
   * @memberof Task
   */
  Id

  /**
   * The name of the task
   * @type {string}
   * @memberof Task
   */
  TaskName

  /**
   * The FQND or Hostname of the Server hosting the task
   * @type {string}
   * @memberof Task
   */
  Server

  /**
   * The start time of the task in minutes since midnight
   * @type {number}
   * @memberof Task
   */
  StartTime

  /**
   * The end time of the task in minutes since midnight 
   * @type {number | undefined}
   * @memberof Task
   */
  EndTime

  /**
   * The interval in minutes in which the task will be repeated
   * @type {number}
   * @memberof Task
   */
  Interval

  /**
   * True indicates the task also runs in the weekend
   * @type {boolean}
   * @memberof Task
   */
  Weekend

  /**
   * The normal duration in minutes of the task
   * @type {number}
   * @memberof Task
   */
  NormalDuration

  /**
   * Discord ID of persons responible for this task
   * @type {string}
   * @memberof Task
   */
  Responsible

  /**
   * Status of the task
   * -1 = DISABLED
   * 0 = NEW
   * 1 = RUNNING
   * 2 = OK
   * 3 = FAILED
   * 4 = FAILED NOTIF SEND
   * @type {-1 | 0 | 1 | 2 | 3 | 4}
   * @memberof Task
   */
  Status

  /**
   * Last time the task has been executed
   * @type {Date | undefined}
   * @memberof Task
   */
  LastRun

  /**
   * Last time the task has completed execution sucessfully
   * @type {Date | undefined}
   * @memberof Task
   */
  LastSuccess

  /**
   * Command the task has executed
   * @type {string}
   * @memberof Task
   */
  Command
}