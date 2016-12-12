/* 
* @Author: Mike Reich
* @Date:   2016-01-25 20:33:11
* @Last Modified 2016-03-01
*/

'use strict';

import _ from 'underscore';
import fm from 'yaml-front-matter';
import node_path from 'path';
import fs from 'fs';
import Promise from 'bluebird';

import Task from '../../task'

export default class FrontMatter extends Task {

  _type() {
    return 'processor'
  }

  _order() {
    return 0
  }

  _processFile(dest, source, opts) {
    this.log.debug('processing front matter', source)
    source = node_path.join(fs.realpathSync(opts.source), source);
    return this._getFrontMatter(source, opts).then((parsedPage) => {
      parsedPage.source = source;
      parsedPage.raw = parsedPage.body;
      opts.files[dest] = parsedPage;
    });
  }

  _getFrontMatter(src, opts) {
    var content = fs.readFileSync(src).toString()
    var pageOpts = content ? fm.loadFront(content, "body") : {}
    if(fs.existsSync(node_path.join(opts.source, "./_includes/")))
      pageOpts.filename = fs.realpathSync(node_path.join(opts.source, "./_includes/"))+"/.";
    return Promise.resolve(pageOpts);
  }
}

  