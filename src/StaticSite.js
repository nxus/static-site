/* 
* @Author: Mike Reich
* @Date:   2015-11-06 16:45:04
* @Last Modified 2016-01-26
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
    this.staticSite = app.get('static-site')
    this.generators = [];
    this.processors = [];
    this.collectors = [];
    
    app.log('Init Static Site Generator')

    this.opts = {config: _.deepExtend(_defaultOpts, app.config.staticSite)};

    fse.ensureDirSync(this.opts.config.output);

    this.opts.config.basePath = this.opts.config.basePath || '/'
    this.router.provide('static', this.opts.config.basePath, fs.realpathSync(this.opts.config.output));

    this.staticSite.gather('collector', this._registerCollector.bind(this))
    this.staticSite.gather('processor', this._registerProcessor.bind(this))
    this.staticSite.gather('generator', this._registerGenerator.bind(this))

    app.once('startup', () => {
      app.log('Static Site Generator Startup')
      app.log('Generating Static Files,')
      return this._process();
    })

    this.staticSite.on('collect', this._processCollectors.bind(this))
    this.staticSite.on('process', this._processProcessors.bind(this))
    this.staticSite.on('generate', this._processGenerators.bind(this))
  }

  _registerGenerator(handler) {
    this.generators.push(handler);
  }

  _registerCollector(handler) {
    this.collectors.push(handler)
  }

  _registerProcessor(handler) {
    this.processors.push(handler)
  }

  _process() {
    if(!fs.existsSync(this.opts.config.source)) throw new Error('Source destination does not exist!')
    return this.staticSite.emit('collect')
            .then(() => {return this.staticSite.emit('process')})
            .then(() => {return this.staticSite.emit('generate')})
            .then(() => this.app.log('Done generating content'));      
  }

  _processCollectors() {
    this.app.log('processing collectors')
    return Promise.mapSeries(this.collectors, (collector) => {
      return collector(this.opts);
    });
  }

  _processGenerators() {
    this.app.log('processing generators')
    return Promise.mapSeries(this.generators, (generator) => {
      return generator(this.opts);
    });
  }

  _processProcessors() {
    this.app.log('processing processors')
    return Promise.mapSeries(this.processors, (processor) => {
      return processor(this.opts);
    });
  }

}

