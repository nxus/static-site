/* 
* @Author: Mike Reich
* @Date:   2016-01-26 07:46:50
* @Last Modified 2016-02-13
*/

'use strict';

import _ from 'underscore';
import Promise from 'bluebird';

export default class Component {

  constructor(app) {
    this.app = app;
    this.staticSite = app.get('static-site')
    this.staticSite.provide(this._type(), this._processFiles.bind(this));
  }

  _type () {
    throw new Error('_type() needs to be overridden')
  }

  _processFiles(opts) {
    if(!opts) return
    let files = _.keys(opts.files)
    return Promise.each(files, (dest) => {
      let source = opts.files[dest]
      return Promise.resolve(this._processFile(dest, source, opts))
    })
  }

  _processFile(dest, source, opts) {
    throw new Error('_processFile needs to be overridden')
  }
}