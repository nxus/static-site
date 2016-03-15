/* 
* @Author: Mike Reich
* @Date:   2016-01-25 19:48:51
* @Last Modified 2016-03-15
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

  _processFiles(opts) {
    return Promise.resolve(super._processFiles(opts)).then(() => {
      _.keys(opts.config.collections).forEach((collection) => {
        if(opts.config[collection] && _.isArray(opts.config[collection]) && opts.config[collection].length > 0)
          opts.config[collection] = opts.config[collection].reverse()
      })
    })
  }

  _processFile(dest, page, opts) {
    page = opts.files[dest]
    var name = dest.split(node_path.sep)[0]
    if(_.contains(_.map(_.keys(opts.config.collections), (m) => {return "_"+m}), name)) {
      if(node_path.basename(dest)[0] != ".") {
        var newName = name;
        if(newName[0] == "_") newName = newName.slice(1, newName.length)
        if(!opts.config[newName]) opts.config[newName] = [];
        if(opts.config.collections[newName].permalink) page.permalink = opts.config.collections[newName].permalink
        opts.config[newName].push(page)
      }
    }
    return Promise.resolve();
  }
}