/* 
* @Author: Mike Reich
* @Date:   2016-01-25 19:48:51
* @Last Modified 2016-03-01
*/

'use strict';

import _ from 'underscore';
import node_path from 'path';
import fs from 'fs';
import Promise from 'bluebird';

import Task from '../base/task'

export default class LayoutProcessor extends Task {

  _type() {
    return 'processor'
  }

  _order() {
    return 4
  }

  _processFile(dest, page, opts) {
    page = opts.files[dest]
    var name = dest.split(node_path.sep)[0]
    if(_.contains(_.keys(opts.config.collections), name)) {
      if(node_path.basename(dest)[0] != ".") {
        var newName = name;
        if(newName[0] == "_") newName = newName.slice(1, newName.length)
        if(!opts.config[newName]) opts.config[newName] = [];
        if(opts.config.collections[name].permalink) page.permalink = opts.config.collections[name].permalink
        opts.config[newName].push(page)
      }
    }
    return Promise.resolve();
  }
}