/* 
* @Author: Mike Reich
* @Date:   2016-02-13 13:45:06
* @Last Modified 2016-02-28
*/

'use strict';

import _ from 'underscore';
import fm from 'yaml-front-matter';
import node_path from 'path';
import fs from 'fs';
import Promise from 'bluebird';

import {renderer} from 'nxus-templater/lib/modules/renderer'

import Task from '../../Task'

export default class Content extends Task {

  _type() {
    return 'processor'
  }

  _processFiles(opts) {
    if(!opts) return
    let files = _.keys(opts.files)
    //Sort to process collection files first
    files = _(files).sortBy((f) => {return _.map(_(opts.collections).keys(), (k) => {if(f.indexOf(k) > -1) return f}).length})
    return Promise.each(files, (dest) => {
      let source = opts.files[dest]
      return Promise.resolve(this._processFile(dest, source, opts))
    })
  }

  _processFile(dest, page, opts) {
    page = opts.files[dest]
    var ext = node_path.extname(page.source).replace(".", "");
    this.log.debug('rendering content for page', dest)
    var newPage = _.extend(page, {page, site: opts})
    if(dest.indexOf('_includes') > -1 || dest.indexOf('_layouts') > -1) return Promise.resolve();
    return renderer.render(ext, newPage.body, newPage)
      .then((content) => {
        page.content = content; 
        page.excerpt = page.content.replace(/(<([^>]+)>)/ig, "").substr(0, 200).trim()+"..."
      })
      .catch(() => { })
  }
}
