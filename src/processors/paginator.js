/*
* @Author: Mike Reich
* @Date:   2016-02-28 13:21:31
* @Last Modified 2016-03-01
*/

'use strict';

import _ from 'underscore'
import Promise from 'bluebird'
import fse from 'fs-extra';
import node_path from 'path';
import fs from 'fs'
Promise.promisifyAll(fse);

import Task from '../base/task'

const defaultOpts = {
  perPage: 9,
  paginate: [
    'posts'
  ],
  layout: "blog_index",
  path: "/blog/%page%/index.html"
}

export default class Paginator extends Task {
  
  _type() {
    return 'processor'
  }

  _order() {
    return 5
  }

  _processFiles(opts) {
    opts.config.paginator = _.extend(defaultOpts, opts.config, (this.opts || {}))
    this.opts = opts.config.paginator
    this.pages = {}
    return Promise.each(_.values(this.opts.paginate), (collection) => {
      this._paginateCollection(collection, opts)
    })
  }

  _paginateCollection(collection, opts) {
    this.app.log('paginating collection', collection)
    if(!this.pages[collection]) this.pages[collection] = {}
    let pages = 1
    opts.config[collection].forEach((p, index) => {
      if(!this.pages[collection][pages]) this.pages[collection][pages] = []
      this.pages[collection][pages].push(p) 
      if((index+1) % this.opts.perPage == 0) pages++
    })
    opts.config.paginator.total_pages = pages
    
    var pageLink = (page) => {
      if(page > 1)
        return this.opts.path.replace("%page%", parseInt(page))
      else
        return this.opts.path.replace("/%page%", "")
    }
    
    var getPages = (totalPages, currentPage) => {
      let min = currentPage < 3 ? 1 : currentPage-2;
      let max = currentPage > totalPages-3 ? totalPages : currentPage+2
      let pages = []
      for(let i = min; i <= max; i++) {
        let p = {
          url: pageLink(i),
          page: i
        }
        pages.push(p)
      }
      return pages
    }
    
    _.keys(this.pages[collection]).forEach((page) => {
      page = parseInt(page)
      let outputPath = pageLink(page)

      let paginator = {
        posts: this.pages[collection][page],
        total_pages: pages,
        current_page: page,
        pages: getPages(pages, page),
        next_page: page < pages ? pageLink(page+1) : "",
        previous_page: page > 1 ? pageLink(page-1) : ""
      }
      opts.files[outputPath] = {layout: this.opts.layout, paginator: paginator, site: opts.config, source: "index.html"}
    })
  }
}