/* eslint-disable no-console */
/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */
let mkdirp = require('mkdirp')
let fs = require('fs')
let path = require('path')
let _ = require('lodash')
let Promise = require('bluebird')
let chalk = require('chalk')

let helper = require('../util/fs')
let util = require('../util')
let {addlogs} = require('../util/log')
let supress = require('../util/extensionsUidReplace')
let stack = require('../util/contentstack-management-sdk')

let config = require('../../config/default')
let reqConcurrency = config.concurrency
let contentTypeConfig = config.modules.content_types
let globalFieldConfig = config.modules.globalfields
let globalfieldsFolderPath
let contentTypesFolderPath
let mapperFolderPath
let globalFieldMapperFolderpath
let globalFieldUpdateFile
let skipFiles = ['__master.json', '__priority.json', 'schema.json']
let fileNames
let field_rules_ct = []
let client

function importContentTypes() {
  let self = this
  this.contentTypes = []
  this.schemaTemplate = require('../util/schemaTemplate')
  this.requestOptions = {
    json: {},
  }
}

importContentTypes.prototype = {
  start: function (credentialConfig) {
    addlogs(config, 'Migrating contenttypes', 'success')
    let self = this
    config = credentialConfig
    client = stack.Client(config)
    globalfieldsFolderPath = path.resolve(config.data, globalFieldConfig.dirName)
    contentTypesFolderPath = path.resolve(config.data, contentTypeConfig.dirName)
    mapperFolderPath = path.join(config.data, 'mapper', 'content_types')
    globalFieldMapperFolderpath =  helper.readFile(path.join(config.data, 'mapper', 'global_fields', 'success.json'))
    globalFieldUpdateFile =  path.join(config.data, 'mapper', 'global_fields', 'success.json')
    fileNames = fs.readdirSync(path.join(contentTypesFolderPath))
    self.globalfields = helper.readFile(path.resolve(globalfieldsFolderPath, globalFieldConfig.fileName))
    for (let index in fileNames) {
      if (skipFiles.indexOf(fileNames[index]) === -1) {
        self.contentTypes.push(helper.readFile(path.join(contentTypesFolderPath, fileNames[index])))
      }
    }
  
    self.contentTypeUids = _.map(self.contentTypes, 'uid')
    self.createdContentTypeUids = []
    if (!fs.existsSync(mapperFolderPath)) {
      mkdirp.sync(mapperFolderPath)
    }
    // avoid re-creating content types that already exists in the stack
    if (fs.existsSync(path.join(mapperFolderPath, 'success.json'))) {
      self.createdContentTypeUids = helper.readFile(path.join(mapperFolderPath, 'success.json')) || []
    }
    self.contentTypeUids = _.difference(self.contentTypeUids, self.createdContentTypeUids)
    // remove contet types, already created
    _.remove(this.contentTypes, function (contentType) {
      return self.contentTypeUids.indexOf(contentType.uid) === -1
    })
    return new Promise(function (resolve, reject) {
      return Promise.map(self.contentTypeUids, function (contentTypeUid) {
        return self.seedContentTypes(contentTypeUid).then(function () {

        }).catch(function (error) {
          return reject(error)
        })
      }, {
        // seed 3 content types at a time
        concurrency: reqConcurrency,
      }).then(function () {
        let batches = []        
        let lenObj = self.contentTypes        
        for (let i = 0; i < lenObj.length; i += 7) {
          batches.push(lenObj.slice(i, i + 7))
        }
        
        return Promise.map(batches, function (batch) {
          return Promise.map(batch, function (contentType) {
          return self.updateContentTypes(contentType).then(function () {
            addlogs(config, contentType.uid + ' was updated successfully!', 'success')
            return
          }).catch(function (err) {
            return reject()
          })
        })
        }).then(function () {
          // eslint-disable-next-line quotes
          if (field_rules_ct.length > 0) {
            fs.writeFile(contentTypesFolderPath + '/field_rules_uid.json', JSON.stringify(field_rules_ct), function (err) {
              if (err) throw err
            })
          }
        
         if( _globalField_pending.length !== 0 ) {
          return self.updateGlobalfields().then(function () {
            addlogs(config, chalk.green('Content types have been imported successfully!'), 'success')
            return resolve()
          }).catch(reject)
         }  else {
            addlogs(config, chalk.green('Content types have been imported successfully!'), 'success')
            return resolve()
         } 
        }).catch(error => {
          return reject(error)
        }) 
        // content type seeidng completed
        // return Promise.map(self.contentTypes, function (contentType) {
        //   return self.updateContentTypes(contentType).then(function () {
        //     log.success(chalk.white(contentType.uid + ' was updated successfully!'))
        //     return
        //   }).catch(function (err) {
        //     return reject()
        //   })
        // }).then(function () {
        //   // eslint-disable-next-line quotes
        //   if (field_rules_ct.length > 0) {
        //     fs.writeFile(contentTypesFolderPath + '/field_rules_uid.json', JSON.stringify(field_rules_ct), function (err) {
        //       if (err) throw err
        //     })
        //   }
        
        //  if( _globalField_pending.length !== 0 ) {
        //   return self.updateGlobalfields().then(function () {
        //     log.success(chalk.green('Content types have been imported successfully!'))
        //     return resolve()
        //   }).catch(reject)
        //  }  else {
        //     log.success(chalk.green('Content types have been imported successfully!'))
        //     return resolve()
        //  } 
        // }).catch(error => {
        //   return reject(error)
        // })
      }).catch(error => {
        return reject(error)
      })
    })
  },
  seedContentTypes: function (uid) {
    let self = this
    return new Promise(function (resolve, reject) {
      let body = _.cloneDeep(self.schemaTemplate)
      body.content_type.uid = uid
      body.content_type.title = uid
      let requestObject = _.cloneDeep(self.requestOptions)
      requestObject.json = body
    return client.stack({api_key: config.target_stack, management_token: config.management_token}).contentType().create(requestObject.json)
      .then(result => {
        return resolve()
      })
      .catch(function (err) {
        let error = JSON.parse(err.message)
        if (error.error_code === 115 && (error.errors.uid || error.errors.title)) {
          // content type uid already exists
          return resolve()
        }
        return reject(error)
      })
    })
  },
  updateContentTypes: function (contentType) {
    let self = this
    return new Promise(function (resolve, reject) {
       let requestObject = _.cloneDeep(self.requestOptions)
      if (contentType.field_rules) {
        field_rules_ct.push(contentType.uid)
        delete contentType.field_rules
      }
      supress(contentType.schema)
      requestObject.json.content_type = contentType
      client.stack({api_key: config.target_stack, management_token: config.management_token}).contentType(contentType.uid).fetch()
      .then(contentTypeResponse => {
        Object.assign(contentTypeResponse, _.cloneDeep(contentType))
        contentTypeResponse.update()
      })
      .then(UpdatedcontentType => {
        return resolve()
      }).catch(err => {
        let error = JSON.parse(err.message)
        addlogs(config, error, 'error')
        return reject()
      })
    })
  },

  updateGlobalfields: function () {
    let self = this
    return new Promise(function (resolve, reject) {
      // eslint-disable-next-line no-undef
      return Promise.map(_globalField_pending, function (globalfield) {
        let lenGlobalField = (self.globalfields).length
        let Obj = _.find(self.globalfields, { 'uid': globalfield});
      return client.stack({api_key: config.target_stack, management_token: config.management_token}).globalField(globalfield).fetch()
        .then(globalFieldResponse => {
          globalFieldResponse.schema = Obj.schema
          globalFieldResponse.update()
          let updateObjpos = _.findIndex(globalFieldMapperFolderpath, function (successobj) {
            let global_field_uid = globalFieldResponse.uid
            return global_field_uid === successobj
          })
          globalFieldMapperFolderpath.splice(updateObjpos, 1, Obj)
          helper.writeFile(globalFieldUpdateFile, globalFieldMapperFolderpath)
        }).catch(function (err) {
          let error = JSON.parse(err.message)
          // eslint-disable-next-line no-console
          addlogs(config, chalk.red('Globalfield failed to update ' + JSON.stringify(error.errors)), 'error')
        })
      }, {
        concurrency: reqConcurrency,
      }).then(function () {
        return resolve()
      }).catch(function (error) {
        // failed to update modified schemas back to their original form
        return reject(error)
      })
    })
  },
}

module.exports = new importContentTypes()