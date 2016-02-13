/* 
* @Author: Mike Reich
* @Date:   2016-01-25 19:46:44
* @Last Modified 2016-02-12
*/

'use strict';

import _ from 'underscore'
import Promise from 'bluebird'
import fse from 'fs-extra';
import node_path from 'path';
import fs from 'fs'
Promise.promisifyAll(fse);

import Task from '../base/task'

export default class FileGenerator extends Task {
  
  _type() {
    return 'generator'
  }

  _processFile(dest, source, opts) {
    this.app.log.debug('processing output file', dest)
    dest = node_path.join(fs.realpathSync(opts.config.output), dest);
    return fse.copySync(source.source, dest);
  }
}