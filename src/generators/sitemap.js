/* 
* @Author: Mike Reich
* @Date:   2016-01-25 19:46:57
* @Last Modified 2016-03-01
*/

'use strict';

import _ from 'underscore'
import Promise from 'bluebird'
import fse from 'fs-extra';
import node_path from 'path';
import fs from 'fs'

Promise.promisifyAll(fse);

import Task from '../base/task'

export default class SitemapGenerator extends Task {
  _type() {
    return 'generator'
  }

  _processFiles(opts) {
    let files = _.compact(_.mapObject(opts.files, (value, key) => {if(key.indexOf('.html') > -1) return value}))
    return this.app.get('renderer').request('renderFile', __dirname+"/../../templates/sitemap.ejs", {files, site: opts.config})
    .then((result) => { 
      fse.outputFileAsync(node_path.join(fs.realpathSync(opts.config.output), "sitemap.xml"), result); 
    });
  }
}