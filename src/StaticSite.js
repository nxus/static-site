/* 
* @Author: Mike Reich
* @Date:   2015-11-06 16:45:04
* @Last Modified 2016-03-01
*/

'use strict';

import _ from 'underscore'
import underscoreDeepExtend from 'underscore-deep-extend'
import util from 'util'
import fs from 'fs'
import fse from 'fs-extra';
import glob from 'glob';
import fm from 'yaml-front-matter';

import node_path from 'path';
import moment from 'moment-strftime';
import slug from 'limax';

import Promise from 'bluebird';

Promise.promisifyAll(fse);
var globAsync = Promise.promisify(glob);

_.mixin({deepExtend: underscoreDeepExtend(_)});

const _defaultOpts = {
  source: './src',
  output: './site',
  data: {},
  tags: [],
  collections: {
    "_posts": {
      permalink: "/[blog]/%y/%m/%d/%title"
    }
  },
  ignore: []
}

export default class StaticSite {
  constructor (app) {
    this.app = app;
    this.router = app.get('router');
    app.get('static-site').use(this)
    
    app.log.debug('Init Static Site Generator')

    this._setOpts()

    this._generators = []
    this._collectors = []
    this._processors = []

    app.config.watch = (app.config.watch || []).concat([process.cwd()+"/"+this.opts.config.source])
    app.config.ignore = (app.config.ignore || []).concat([process.cwd()+"/"+this.opts.config.output])

    fse.ensureDirSync(this.opts.config.output);
    this.opts.config.basePath = this.opts.config.basePath || '/'

    this.router.static(this.opts.config.basePath, fs.realpathSync(this.opts.config.output));

    this.gather('collector')
    .gather('processor')
    .gather('generator')

    ///app.get('pipeliner').pipeline('static-site')

    app.once('startup', () => {
      this._setOpts();
      app.log.debug('Static Site Generator Startup')
      app.log.debug('Generating Static Files')
      return this._setupPipeline().then(this._process.bind(this))
    })
  }

  _setOpts() {
    this.opts = {config: _.deepExtend(_defaultOpts, this.app.config.staticSite, {siteName: this.app.config.siteName, baseUrl: this.app.config.baseUrl})};    
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
    console.log('registering pipeline')
    var sort = (i) => {
      console.log('i.order', i.order)
      if(i.order > -1)
        return i.order
      else
        return 10000000
    }
    return Promise.each(_.sortBy(this._generators, sort), (m) => {
      return this.app.get('pipeliner').task('static-site', 'generate', m.handler)
    }).then(() => {
      return Promise.each(_.sortBy(this._processors, sort), (m) => {
        return this.app.get('pipeliner').task('static-site', 'process', m.handler)
      })
    }).then(() => {
      return Promise.each(_.sortBy(this._collectors, sort), (m) => {
        return this.app.get('pipeliner').task('static-site', 'collect', m.handler)
      })
    })
  }

  _process() {
    console.log('processing pipeline')
    if(!fs.existsSync(this.opts.config.source)) throw new Error('Source destination does not exist!')
    return this.app.get('pipeliner').run('static-site', this.opts)  
  }
}

