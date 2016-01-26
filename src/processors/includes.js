/* 
* @Author: Mike Reich
* @Date:   2016-01-26 08:34:41
* @Last Modified 2016-01-26
*/


'use strict';

import _ from 'underscore';
import fm from 'yaml-front-matter';
import node_path from 'path';
import fs from 'fs';
import Promise from 'bluebird';

import Task from '../base/task'

export default class LayoutProcessor extends Task {

  _type() {
    return 'processor'
  }

  _processFiles(opts) {
    return super._processFiles(opts)
  }

  _processFile(dest, source, opts) {
    if(dest.indexOf('_includes') > -1 ) delete opts.files[dest]
    return Promise.resolve();
  }
}