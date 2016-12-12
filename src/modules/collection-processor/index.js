/* 
* @Author: Mike Reich
* @Date:   2016-01-25 19:48:51
* @Last Modified 2016-04-07
*/

'use strict';

import _ from 'underscore';
import node_path from 'path';
import fs from 'fs';
import Promise from 'bluebird';

import Task from '../../Task'

export default class LayoutProcessor extends Task {

  _type() {
    return 'processor'
  }

  _order() {
    return 4
  }

  _processFiles(opts) {
    return Promise.resolve(super._processFiles(opts)).then(() => {
      _.keys(opts.collections).forEach((collection) => {
        this.log.debug('Processing collection', collection)
        if(opts[collection] && _.isArray(opts[collection]) && opts[collection].length > 0)
          opts[collection] = opts[collection].reverse()
      })
    })
  }

  _processFile(dest, page, opts) {
    page = opts.files[dest]
    var name = dest.split(node_path.sep)[0]
    debugger
    if(_.contains(_.map(_.keys(opts.collections), (m) => {return "_"+m}), name)) {
      if(node_path.basename(dest)[0] != ".") {
        var newName = name;
        if(newName[0] == "_") newName = newName.slice(1, newName.length)
        if(!opts[newName]) opts[newName] = [];
        if(opts.collections[newName].path) page.path = opts.collections[newName].path
        opts[newName].push(page)
      }
    }
    return Promise.resolve();
  }
}