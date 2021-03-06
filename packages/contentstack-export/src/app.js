/* eslint-disable no-redeclare */
var Bluebird = require('bluebird')
var util = require('./lib/util')
var login = require('./lib/util/login')
var {addlogs} = require('./lib/util/log')
const chalk = require('chalk')
let path = require('path')

exports.initial = function (config) {
  config = util.buildAppConfig(config)
  util.validateConfig(config)
  exports.getConfig = function () {
    return config
  }

  login.login(config).then(function () {
    var types = config.modules.types
    if (config.moduleName && config.moduleName !== undefined) {
      singleExport(config.moduleName, types, config)
    } else {
      allExport(config, types)
    }
  }).catch(error => {
    if (error.errors.api_key) {
      addlogs(config, chalk.red('Stack Api key ' + error.errors.api_key[0], 'Please enter valid Key', 'error'))
      addlogs(config, 'The log for this is stored at ' + config.data + '/export/logs', 'success')
    } else {
      let objKey = Object.keys(error.errors)
      addlogs(config, chalk.red('Stack fail to export, ' + objKey + "" + error.errors[objKey][0]), 'error')
    }
  })
}

var singleExport = (moduleName, types, config) => {
  var types = config.modules.types
  if (types.indexOf(moduleName) > -1) {
    var exportedModule = require('./lib/export/' + moduleName)
    exportedModule.start(config).then(function () {
      addlogs(config, moduleName + ' was exported successfully!', 'success')
      addlogs(config, 'The log for this is stored at ' + path.join(config.data , 'logs', 'export'), 'success')
    }).catch(function (error) {
      addlogs(config, 'Failed to migrate ' + moduleName, 'error')
      addlogs(config, error, 'error')
      addlogs(config, 'The log for this is stored at ' + path.join(config.data , 'logs', 'export'), 'error')
    })
  } else {
    addlogs(config, 'Please provide valid module name.', 'error')
  }
}

var allExport = async (config, types) => {
  var counter = 0
  Bluebird.map(types, function (type) {
    if (config.preserveStackVersion) {
      var exportedModule = require('./lib/export/' + types[counter])
      counter++
      return exportedModule.start(config)
    } else if(!config.preserveStackVersion && type !== 'stack')  {
      var exportedModule = require('./lib/export/' + types[counter])
      counter++
      return exportedModule.start(config)
    } else {
      counter++
    }
  }, {
    concurrency: 1,
  }).then(function () {
    addlogs(config, chalk.green('Stack: ' + config.source_stack + ' has been exported succesfully!'), 'success')
    addlogs(config, 'The log for this is stored at ' + path.join(config.data , 'logs', 'export'), 'success')
  }).catch(function () {
    addlogs(config, chalk.red('Failed to migrate stack: ' + config.source_stack + '. Please check error logs for more info'), 'error')
    addlogs(config, 'The log for this is stored at ' + path.join(config.data , 'logs', 'export'), 'error')
  })
}
