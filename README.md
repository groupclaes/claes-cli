# Claes-CLI [![Build Status](https://img.shields.io/travis/groupclaes/claes-cli/master.svg )](https://travis-ci.org/groupclaes/claes-cli) [![Known Vulnerabilities](https://snyk.io/test/github/groupclaes/claes-cli/badge.svg)](https://snyk.io/test/github/groupclaes/claes-cli) [![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/dwyl/esta/issues) [![depenencies](https://status.david-dm.org/gh/groupclaes/claes-cli.svg)](https://david-dm.org/groupclaes/claes-cli) [![devDepenencies](https://status.david-dm.org/gh/groupclaes/claes-cli.svg?type=dev)](https://david-dm.org/groupclaes/claes-cli?type=dev) [![Maintainability](https://api.codeclimate.com/v1/badges/673debd507b01daa20ea/maintainability)](https://codeclimate.com/github/groupclaes/claes-cli/maintainability) [![Test Coverage](https://api.codeclimate.com/v1/badges/673debd507b01daa20ea/test_coverage)](https://codeclimate.com/github/groupclaes/claes-cli/test_coverage) [![issues](https://img.shields.io/github/issues/groupclaes/claes-cli.svg )](https://github.com/groupclaes/claes-cli) [![license](https://img.shields.io/github/license/groupclaes/claes-cli)](https://github.com/groupclaes/claes-cli)

## Claes cli is meant for INTERNAL USE ONLY and this repo is only publicly available for educational purposes


## Table of contents
 - [Requirements](#Requirements)
 - [Features](#Features)
 - [Instalation](#Installation)
 - [Examples](#Examples)
   - [Check Task Status](#Check-Task-Status)


## Requirements
 * NodeJS (any version above 8 should work)
 * Internet connection (obviously)
 * Common sense (probably ok)

## Features
This CLI application is designed to run/automate migrations, tests etc for Claes Food Projects and related companies
For example status checking for tasks, migration of old Databases, pcm Object migrations ...

Currently implemented commands are (--help): 
```
      --help               Show help                                   [boolean]
      --version            Show version number                         [boolean]
  -n, --name               Your name                                    [string]
  -s, --search             Search term                                  [string]
      --check-task-status  Check all tasks for status                   [string]
```

## Instalation
`npm i -g claes-cli@latest`

## Examples
### Check Task Status 
Retreive all Tasks from the GroupClaes API and evaluate their status  
`claes-cli --check-task-status`

## Link to npm (not yet published)
#### [![https://nodei.co/npm/claes-cli.png?downloads=true&downloadRank=true&stars=true](https://nodei.co/npm/claes-cli.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/claes-cli)
