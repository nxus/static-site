/* 
* @Author: Mike Reich
* @Date:   2016-01-26 07:43:48
* @Last Modified 2016-02-12
*/

'use strict';

import _ from 'underscore'
import Promise from 'bluebird'
import fse from 'fs-extra';
import node_path from 'path';
import fs from 'fs'
import underscoreDeepExtend from 'underscore-deep-extend'

Promise.promisifyAll(fse);

import Task from '../base/task'

const _renderExtensions = {
  "md": "html",
  "ejs": "html",
  "html": "html",
  "markdown": "html"
}

_.mixin({deepExtend: underscoreDeepExtend(_)});

export default class PageGenerator extends Task {
  _type() {
    return 'generator'
  }

  _processFiles(opts) {
    this.layouts = opts.layouts
    return super._processFiles(opts)
  }

  _processFile(dest, page, opts) {
    var oldDest = dest
    if(dest && dest[0] == '_') return Promise.resolve();
    dest = node_path.join(fs.realpathSync(opts.config.output), dest);
    
    var newExt = "html"
    var ext = node_path.extname(page.source).replace(".", "");

    if(ext && _.contains(_.keys(_renderExtensions), ext)) {
      if(_renderExtensions[ext]) newExt = _renderExtensions[ext];
      dest = dest.replace("."+ext, "");
      dest = dest+"."+newExt;
    }

    if(_.contains(_.keys(_renderExtensions), ext)) {
      this.app.log.debug('processing output page', dest)
      delete opts.files[oldDest];
      page = _.extend(page, {page, site: opts.config})
      return this._renderContent(page).then((content) => {
        return fse.outputFileAsync(dest, content);
      })
    } 
  }

  _render (type, content, opts) {
    return this.app.get('renderer').request('render', type, content, opts).then((result) => { return result; });
  }

  _renderContent (page) {
    if(typeof page.layout == 'undefined') page.layout = 'default';
    return this._renderWithLayout(page)
  }

  _renderWithLayout (page) {
    var ext = node_path.extname(page.source).replace(".", "");
    return this._render(ext, page.body, page).then((c) => {
      if(page.layout && this.layouts[page.layout]) {
        page = _.clone(page);
        var layout = this.layouts[page.layout]
        page.content = c
        page = _.deepExtend(page, layout)
        page.body = layout.body
        if(!layout.layout) delete page.layout
        return this._renderWithLayout(page)
      } else {
        return c;
      }
    })
  }
}

