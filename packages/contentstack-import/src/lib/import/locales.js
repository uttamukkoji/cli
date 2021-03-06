/* eslint-disable no-prototype-builtins */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

let mkdirp = require('mkdirp')
let fs = require('fs')
let path = require('path')
let Promise = require('bluebird')
let chalk = require('chalk')

let helper = require('../util/fs')
let {addlogs} = require('../util/log')
let util = require('../util')
let stack = require('../util/contentstack-management-sdk')
let config = require('../../config/default')
let reqConcurrency = config.concurrency
let langConfig = config.modules.locales
let langFolderPath
let langMapperPath
let langUidMapperPath
let langSuccessPath
let langFailsPath 
let client

let masterLanguage = config.master_locale

function importLanguages() {
  this.fails = []
  this.success = []
  this.langUidMapper = {}
}

importLanguages.prototype = {
  start: function (credentialConfig) {  
    addlogs(config, 'Migrating languages', 'success')
    let self = this
    config = credentialConfig
    client = stack.Client(config)
    langFolderPath = path.resolve(config.data, langConfig.dirName)
    langMapperPath = path.resolve(config.data, 'mapper', 'languages')
    langUidMapperPath = path.resolve(config.data, 'mapper', 'languages', 'uid-mapper.json')
    langSuccessPath = path.resolve(config.data, 'mapper', 'languages', 'success.json')
    langFailsPath = path.resolve(config.data, 'mapper', 'languages', 'fails.json')
    mkdirp.sync(langMapperPath)
    self.languages = helper.readFile(path.resolve(langFolderPath, langConfig.fileName))
    if (fs.existsSync(langUidMapperPath)) {
      self.langUidMapper = helper.readFile(langUidMapperPath)
      self.langUidMapper = self.langUidMapper || {}
    }

    return new Promise(function (resolve, reject) {
      if (self.languages === undefined) {
        addlogs(config, chalk.white('No Languages Found'), 'error')
        return resolve()
      }
      let langUids = Object.keys(self.languages)
      return Promise.map(langUids, function (langUid) {
        let lang = self.languages[langUid]
        if (!self.langUidMapper.hasOwnProperty(langUid) && (lang.code !== masterLanguage)) {
          let requestOption = {
            locale: {
              code: lang.code,
              name: lang.name,
            },
          }
          
         return client.stack({api_key: config.target_stack, management_token: config.management_token}).locale().create(requestOption)
          .then(locale => {                    
            self.update_locales(lang)
            self.success.push(locale.items)
            self.langUidMapper[langUid] = locale.uid
            helper.writeFile(langUidMapperPath, self.langUidMapper)
          }).catch(function (err) {
            let error = JSON.parse(err.message)
            if (error.hasOwnProperty('errorCode') && error.errorCode === 247) {
              addlogs(config, error.errors.code[0], 'success')
              return
            }
            self.fails.push(lang)
            addlogs(config, chalk.red('Language: \'' + lang.code + '\' failed to be import\n'), 'error')
          })
        } else {
          // the language has already been created
          addlogs(config, chalk.yellow('The language: \'' + lang.code + '\' already exists.'), 'error')
        }

        // import 2 languages at a time
      }, {
        concurrency: reqConcurrency,
      }).then(function () {
        // languages have imported successfully
        helper.writeFile(langSuccessPath, self.success)
        addlogs(config, chalk.green('Languages have been imported successfully!'), 'success')
        return resolve()
      }).catch(function (error) {
        // error while importing languages
        helper.writeFile(langFailsPath, self.fails)
        addlogs(config, chalk.red('Language import failed'), 'error')
        return reject(error)
      })
    })
  },
  update_locales: function (lang) {
    let self = this
  return client.stack({api_key: config.target_stack, management_token: config.management_token}).locale(lang.code).fetch()
    // return request(requestOption)
    .then(function (locale) {      
      locale.code = lang.code
      locale.fallback_locale = lang.fallback_locale
      locale.name = lang.name
      return locale.update()
    }).catch(function (error) {
      // let error = JSON.parse(err.message)
      if (error.hasOwnProperty('errorCode') && error.errorCode === 247) {
        addlogs(config, error.errors.code[0], 'error')
        return
      }
      self.fails.push(lang)
      addlogs(config, 'Language: \'' + lang.code + '\' failed to update\n', 'error')
      return
    })
  },
}

module.exports = new importLanguages()
