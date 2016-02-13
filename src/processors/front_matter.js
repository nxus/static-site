/* 
* @Author: Mike Reich
* @Date:   2016-01-25 20:33:11
* @Last Modified 2016-02-12
*/

'use strict';

import _ from 'underscore';
import fm from 'yaml-front-matter';
import node_path from 'path';
import fs from 'fs';
import Promise from 'bluebird';

import Task from '../base/task'

export default class FrontMatter extends Task {

  _type() {
    return 'processor'
  }

  _processFile(dest, source, opts) {
    this.app.log.debug('processing front matter', source)
    opts.config.tags = []
    source = node_path.join(fs.realpathSync(opts.config.source), source);
    return this._getFrontMatter(source, opts).then((parsedPage) => {
      parsedPage.source = source;
      parsedPage.raw = parsedPage.body;
      if(parsedPage.raw) parsedPage.excerpt = parsedPage.raw.replace(/(<([^>]+)>)/ig, "").substr(0, 200)+"..."
      if(parsedPage.tags) opts.config.tags = opts.config.tags.concat(parsedPage.tags)
      opts.files[dest] = parsedPage;
    });
  }

  _getFrontMatter(src, opts) {
    var content = fs.readFileSync(src).toString()
    var pageOpts = content ? fm.loadFront(content, "body") : {}
    if(fs.existsSync(node_path.join(opts.config.source, "./_includes/")))
      pageOpts.filename = fs.realpathSync(node_path.join(opts.config.source, "./_includes/"))+"/.";
    return Promise.resolve(pageOpts);
  }
}

  