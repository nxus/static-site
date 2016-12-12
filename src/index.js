/* 
* @Author: Mike Reich
* @Date:   2016-01-25 19:26:52
* @Last Modified 2016-03-15
*/

'use strict';

//import DataCollector from './collectors/data.js'
//
import Promise from 'bluebird'

import {router} from 'nxus-router'
import {application as app, NxusModule} from 'nxus-core'
import {pipeliner} from 'nxus-pipeliner'

import _ from 'underscore'
import util from 'util'
import fs from 'fs'
import fse from 'fs-extra';
import glob from 'glob';
import fm from 'yaml-front-matter';

import node_path from 'path';
import moment from 'moment-strftime';
import slug from 'limax';

class StaticSite extends NxusModule {
  constructor(opts) {
    super(opts)
    this.log.debug('Init Static Site Generator')

    this._generators = []
    this._collectors = []
    this._processors = []
    this._dataParsers = []

    this.config.watch = (this.config.watch || []).concat([process.cwd()+"/"+this.config.source])
    this.config.ignore = (this.config.ignore || []).concat([process.cwd()+"/"+this.config.output])

    fse.ensureDirSync(this.config.output);
    this.config.basePath = this.config.basePath || '/'

    router.staticRoute(this.config.basePath, fs.realpathSync(this.config.output));

    ///app.get('pipeliner').pipeline('static-site')

    pipeliner.pipeline('static-site')

    app.onceAfter('launch', () => {
      this.log.debug('Static Site Generator Startup')
      this.log.debug('Generating Static Files')
      return this._setupPipeline().then(::this._process)
    })
  }

  _defaultConfig() {
    return {
      source: './src',
      output: './site',
      data: {},
      tags: [],
      collections: {
        "posts": {
          path: "/[blog]/%y/%m/%d/%title"
        }
      },
      paginator: {},
      ignore: []
    }
  }

  dataParser(handler, order) {
    this._dataParsers.push({order, handler})
  }

  generator(handler, order) {
    this._generators.push({order, handler})
  }

  collector(handler, order) {
    this._collectors.push({order, handler})
  }

  processor(handler, order) {
    this._processors.push({order, handler})
  }

  _setupPipeline() {
    var sort = (i) => {
      if(i.order > -1)
        return i.order
      else
        return 10000000
    }
    this.log.debug(this._generators)
    return Promise.each(_.sortBy(this._collectors, sort), (m) => {
      this.log.debug('Register collector')
      return pipeliner.task('static-site', m.handler)
    }).then(() => {
      return Promise.each(_.sortBy(this._processors, sort), (m) => {
        this.log.debug('Register processor')
        return pipeliner.task('static-site', m.handler)
      })
    }).then(() => {
      return Promise.each(_.sortBy(this._generators, sort), (m) => {
        this.log.debug('Register generator')
        return pipeliner.task('static-site', m.handler)
      })
    })
  }

  _process() {
    this.log.debug('Processing pipeline')
    if(!fs.existsSync(this.config.source)) throw new Error('Source destination does not exist!')
    return pipeliner.run('static-site', this.config)  
  }
}

export default StaticSite
export let staticSite = StaticSite.getProxy()