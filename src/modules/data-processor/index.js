/* 
* @Author: Mike Reich
* @Date:   2016-01-25 19:52:41
* @Last Modified 2016-02-12
*/

'use strict';

'use strict';

import _ from 'underscore';
import fm from 'yaml-front-matter';
import node_path from 'path';
import fs from 'fs';
import Promise from 'bluebird';

import Task from '../../task'

export default class DataProcessor extends Task {

  constructor(app) {
    super(app)
    this.dataParsers = {};

    app.get('static-site').gather('data-parser', this._registerDataParser.bind(this))
  }

  _registerDataParser(type, handler) {
    this.dataParsers[type] = handler;
  }

  _type() {
    return 'processor'
  }

  _processFiles(opts) {
    opts.data = {}
    return super._processFiles(opts)
  }

  _processFile(dest, source, opts) {
    if(dest.indexOf('_data') > -1 && node_path.basename(dest)[0] != ".") {
      var name = node_path.basename(dest.replace("_data/", ""), node_path.extname(dest));
      delete opts.files[dest]
      return this._processDataFile(source, opts).then((data) => {
        opts.data[name] = data;
      });
    }
    return Promise.resolve();
  }

  _processDataFile(file, opts) {
    //read file
    var data = {};
    var ext = node_path.extname(file.source).replace(".", "");
    this.log.debug('this.dataParsers', this.dataParsers)
    if(this.dataParsers[ext]) {
      return this.dataParsers[ext](file.body)
    }
    else return Promise.resolve()
  }
}