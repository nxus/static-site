/* 
* @Author: Mike Reich
* @Date:   2016-01-26 07:36:01
* @Last Modified 2016-04-07
*/

'use strict';

import _ from 'underscore';
import node_path from 'path';
import fs from 'fs';
import Promise from 'bluebird';
import slug from 'limax';
import moment from 'moment-strftime';

import Task from '../base/task'

export default class OutputPath extends Task {

  _type() {
    return 'processor'
  }

  _order() {
    return 5
  }

  _processFile(dest, page, opts) {
    this.app.log.debug('processing output path', dest)
    return this._generateOutputPath(dest, page, opts).then((outputPath) => {
      delete opts.files[dest];
      let i = 1
      let op = outputPath
      while (opts.files[op]) {
        op = outputPath.replace(".html", "")+"-"+i+".html"
        i++
      } 
      page.url = op
      opts.files[op] = page;
    });
  }

  _generateOutputPath (to, page, opts) {
    var ext = node_path.extname(to);
    if(!page) return Promise.resovle(to)
    if(page.permalink) {
      to = page.permalink
      if(to[to.length-1] == '/')
        to += 'index.html'
    } else if(page.path) {
      var permalink = page.path;
      var title = page.title || 'index'
      permalink = permalink.replace("%title", (title ? "["+slug(title)+"]" : ""))
      to = moment(page.date).strftime(permalink)+".html";
    }
    this.app.log.debug('outputpath', to)
    return Promise.resolve(to)
  }
}
