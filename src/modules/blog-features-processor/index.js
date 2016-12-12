/*
* @Author: Mike Reich
* @Date:   2016-02-28 12:58:44
* @Last Modified 2016-03-02
*/

'use strict';

import _ from 'underscore';
import fm from 'yaml-front-matter';
import node_path from 'path';
import fs from 'fs';
import Promise from 'bluebird';

import Task from '../../Task'

export default class FrontMatter extends Task {

  _type() {
    return 'processor'
  }

  _order() {
    return 1
  }

  _processFile(dest, page, opts) {
    this.log.debug('processing blog features', page.source)
    if(page.tags) opts.tags = _.unique((opts.tags || []).concat(page.tags))
    if(page.featured) opts.featured = _.unique((opts.featured || []).concat(page))
    if(page.categories) opts.categories = _.unique((opts.categories || []).concat(_.map(page.categories, (c) => {return c.toLowerCase()})))
  }
}
