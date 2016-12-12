/*
* @Author: Mike Reich
* @Date:   2016-02-28 13:21:31
* @Last Modified 2016-03-15
*/

'use strict';

import _ from 'underscore'
import Promise from 'bluebird'
import fse from 'fs-extra';
import node_path from 'path';
import fs from 'fs'
Promise.promisifyAll(fse);

import Task from '../../Task'

export default class Paginator extends Task {
  
  constructor(app, plugin) {
    super(app, plugin)
  }

  _defaultConfig() {
    return {
      perPage: 9,
      paginate: [
        'posts'
      ],
      layout: "blog",
      path: "/blog/%page%/index.html"
    }
  }

  _type() {
    return 'processor'
  }

  _order() {
    return 5
  }

  _processFiles(opts) {
    this.pages = {}
    console.log(this.config)
    return Promise.each(_.values(this.config.paginate), (collection) => {
      this._paginateCollection(collection, opts)
    })
  }

  _paginateCollection(collection, opts) {
    if(!opts[collection]) return
    this.log.debug('paginating collection', collection)
    if(!this.pages[collection]) this.pages[collection] = {}
    let pages = 1
    opts[collection].forEach((p, index) => {
      if(!this.pages[collection][pages]) this.pages[collection][pages] = []
      this.pages[collection][pages].push(p) 
      if((index+1) % this.config.perPage == 0) pages++
    })
    opts.paginator.total_pages = pages
    
    var pageLink = (page) => {
      if(page > 1)
        return this.config.path.replace("%page%", parseInt(page))
      else
        return this.config.path.replace("/%page%", "")
    }
    
    var getPages = (totalPages, currentPage) => {
      let min = currentPage < 5 ? 1 : currentPage-2;
      let max = currentPage > totalPages-5 ? totalPages : currentPage+4
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
      opts.files[outputPath] = {layout: this.config.layout, paginator: paginator, site: opts, source: "index.html"}
    })
  }
}