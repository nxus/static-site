/*
* @Author: Mike Reich
* @Date:   2016-02-28 12:58:44
* @Last Modified 2016-02-29
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

  _processFile(dest, page, opts) {
    this.app.log.debug('processing blog features', page.source)
    if(page.tags) opts.config.tags = _.unique((opts.config.tags || []).concat(page.tags))
    if(page.featured) opts.config.featured = _.unique((opts.config.featured || []).concat(page))
    if(page.categories) opts.config.categories = _.unique((opts.config.categories || []).concat(page.categories))
  }
}
