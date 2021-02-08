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