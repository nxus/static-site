/* 
* @Author: Mike Reich
* @Date:   2016-01-26 08:26:31
* @Last Modified 2016-03-01
*/

'use strict';

import _ from 'underscore';
import fm from 'yaml-front-matter';
import node_path from 'path';
import fs from 'fs';
import Promise from 'bluebird';

import Task from '../../task'

export default class LayoutProcessor extends Task {

  _type() {
    return 'processor'
  }

  _order() {
    return 2
  }

  _processFiles(opts) {
    opts.layouts = {}
    return super._processFiles(opts)
  }

  _processFile(dest, source, opts) {
    if(dest.indexOf('_layouts') > -1 && node_path.basename(dest)[0] != ".") {
      var name = node_path.basename(dest.replace("_layouts/", ""), node_path.extname(dest));
      delete opts.files[dest]
      opts.layouts[name] = source;
    }
    return Promise.resolve();
  }
}