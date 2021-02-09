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
  let result = 'err: status-unknow'
  // last time the schedule has started
  let lastRun = new Date()

  if (task.LastRun !== undefined && task.LastRun !== null) {
    lastRun = stringToDateDate(task.LastRun)
  }

  switch (task.Status) {
    case -1:
    case 0:
      result = evaluateTaskDisabledOrNewState(task)
      break

    case 1: // task is running
      result = evaluateTaskRunningState(lastRun, task)
      break

    case 2: // task is ok
      result = evaluateTaskOkState(lastRun, task)
      break

    case 3: // task in in error status
      result = evaluateTaskFailedState()
      break

    case 4: // alert should've has already been send, pretend everything is fine.
      result = evaluateTaskFailedNotifSendState()
      break
  }

  return result
}

function evaluateTaskDisabledOrNewState(task) {
  console.log(`'task' ${task.Id}, 'status is either disabled or has never ran yet.'`, { severity: 7 })
  return 'ok'
}

function evaluateTaskRunningState(lastRun, task) {
  let result = 'ok'

  // check if the task has been running to long
  if ((lastRun.getTime() + ((task.NormalDuration + 1) * 60000)) <= now.getTime()) {
    // the task has been running too long.
    result = 'err: overtime'
  } // otherwise the task is probably doing fine.

  return result
}

function evaluateTaskOkState(lastRun, task) {
  let result = 'ok'

  const now = stringToDateDate()
  const firstRun = calculateTaskTime(now, task.StartTime)

  if (task.LastRun) {
    let currentSchedule = firstRun

    // check if the task has an interval, if so calculate the currently planned start time
    if (task.Interval > 0) {
      currentSchedule = calculateTaskTimeFromInterval(now, firstRun, task.Interval)
    }

    if (!task.Weekend && (now.getDay() == 0 || now.getDay() == 6)) {
      // if task should not run in weekend and today is weekend, return true.
      // console.log(`task ${task.Id}, 'if task should not run in weekend and today is weekend, return true.'`)
      // offset by one minute to check single run
    } else if (lastRun && new Date(lastRun.getTime() + 60000) > firstRun && task.Interval == 0) {
      // task only runs once and is on schedule
      // console.log(`task ${task.Id}, 'task only runs once and is on schedule, timing ok.'`)
    } else if (now < firstRun) {
      // do nothing since the schedule is not suposed to run before this.
      // console.log(`task ${task.Id}, 'do nothing since the schedule is not suposed to run before this.'`)
    } else if (now > currentSchedule) {
      let endRun = new Date()

      if (task.EndTime != null) {
        endRun = calculateTaskTime(now, task.EndTime)
      }

      // check if the schedule started as planned
      if (lastRun >= currentSchedule) {
        // schedule has started as planned.
        // console.log(`task ${task.Id}, 'schedule has started as planned.'`)
      } else if (task.EndTime != null && currentSchedule > endRun) {
        // endtime is defined and shedule is after endtime => ignore
        // console.log(`task ${task.Id}, 'endtime is defined and shedule is after endtime => ignore.'`)
      } else if (now <= new Date(currentSchedule.getTime() + 60000)) {
        // schedule has 1 minute to start as planned.
        // console.log(`task ${task.Id}, 'schedule has 1 minute to start as planned.'`)
      } else {
        // return 'ok';
        result = 'err: task-not-started'
      }
    }
  } else {
    // task has never run but status is set, call in for I am comfusion
    result = 'err: confused'
  }
  return result
}

function evaluateTaskFailedState() {
  return 'failed'
}

function evaluateTaskFailedNotifSendState() {
  return 'ok'
}

function calculateTaskTimeFromInterval(now, date, interval) {
  // task has an interval => find current interval
  let myDate = new Date(date.getTime() + (interval * 60000))

  while (myDate <= now) {
    date = myDate
    myDate = new Date(date.getTime() + (interval * 60000))
  }

  return date
}

/**
 * calculate task time from nowtime and time of the task
 * @param {DateTime} now
 * @param {number} time
 * @returns {Date} Today + Time Correction + Task time
 */
function calculateTaskTime(now, time) {
  return new Date(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() + time * 60000)
}

/**
 * Update the status for Task with id: {id}
 * @param {number} id Task id
 * @param {string} status New Task status
 * @returns
 */
function setTaskStatus(id, status) {
  return axios.get(`https://api.groupclaes.be/tasks/${id}/status?status=${status}`, { headers: { Accept: 'application/json' } })
}

/**
 * return Time in Miliseconds for Date? if present otherwise time now
 * @param {string | undefined} date
 * @returns {number}
 */
function stringToDateTime(date) {
  if (date) {
    return new Date(date).getTime()
  }
  return new Date().getTime()
}

/**
 * Return Date Object from number
 * @param {number} date
 * @returns {Date} result
 */
function stringToDateDate(date) {
  return new Date(stringToDateTime(date))
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