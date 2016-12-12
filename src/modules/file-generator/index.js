/* 
* @Author: Mike Reich
* @Date:   2016-01-25 19:46:44
* @Last Modified 2016-03-01
*/

'use strict';

import _ from 'underscore'
import Promise from 'bluebird'
import fse from 'fs-extra';
import node_path from 'path';
import fs from 'fs'
Promise.promisifyAll(fse);

import Task from '../../Task'

export default class FileGenerator extends Task {
  
  _type() {
    return 'generator'
  }

  _processFile(dest, source, opts) {
    this.log.debug('generating output file', dest, opts.output)
    dest = node_path.join(fs.realpathSync(opts.output), dest);
    return fse.copySync(source.source, dest);
  }
}