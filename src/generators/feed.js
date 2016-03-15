/* 
* @Author: Mike Reich
* @Date:   2016-01-25 19:47:07
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

export default class FeedGenerator extends Task {
  _type() {
    return 'generator'
  }

  _processFiles(opts) {
    return this.app.get('renderer').request('renderFile', __dirname+"/../../templates/feed.ejs", {site: opts.config})
    .then((result) => { 
      fse.outputFileAsync(node_path.join(fs.realpathSync(opts.config.output), "feed.xml"), result); 
    });
  }
}