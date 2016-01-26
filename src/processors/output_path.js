/* 
* @Author: Mike Reich
* @Date:   2016-01-26 07:36:01
* @Last Modified 2016-01-26
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

  _processFile(dest, page, opts) {
    console.log('processing output path', dest)
    return this._generateOutputPath(dest, page, opts).then((outputPath) => {
      delete opts.files[dest];
      page.url = outputPath+".html"
      opts.files[outputPath] = page;
    });
  }

  _generateOutputPath (to, page, opts) {
    var ext = node_path.extname(to);
    if(!page) return Promise.resovle(to)
    if(page.permalink) {
      var permalink = page.permalink;
      var title = page.title || 'index'
      permalink = permalink.replace("%title", (title ? "["+slug(title)+"]" : ""))
      to = moment(opts.published).strftime(permalink);
    }
    console.log('outputpath', to)
    return Promise.resolve(to)
  }
}
