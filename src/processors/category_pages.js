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
import slug from 'limax'
Promise.promisifyAll(fse);

import Task from '../base/task'

const defaultOpts = {
  categorize: [
    'posts'
  ],
  layout: "blog_category",
  path: "/blog/%category%/%page%/index.html"
}

export default class CategoryPages extends Task {
  
  constructor(app, plugin) {
    super(app, plugin)
    plugin.addDefaultConfig('categoryPages', defaultOpts)
  }

  _type() {
    return 'processor'
  }

  _order() {
    return 6
  }

  _processFiles(opts) {
    this.categoryPages = {}
    this.categories = []
    this.opts = opts.config.categoryPages
    this.app.log.debug('Creating category pages')
    
    let pages = 1
    
    _.filter(opts.files, (p) => {if(p.categories) return p;}).forEach((p, index) => {
      let cats = _.map(p.categories, (c) => {return c.toLowerCase()})
      this.categories = _.unique(this.categories.concat(cats))
      cats.forEach((category) => {
        if(!this.categoryPages[category]) this.categoryPages[category] = {}
        if(!this.categoryPages[category][pages]) this.categoryPages[category][pages] = []
        this.categoryPages[category][pages].push(p) 
        if((index+1) % opts.config.paginator.perPage == 0) pages++
      })
    })
    
    this.categories.forEach((category) => {
      var pageLink = (category, page) => {
        if(page > 1)
          return this.opts.path.replace("%category%", slug(category)).replace("%page%", page)
        else
          return this.opts.path.replace("%category%", slug(category)).replace("/%page%", "")
      }
      
      var getPages = (totalPages, currentPage) => {
        let min = currentPage < 3 ? 1 : currentPage-2;
        let max = currentPage > totalPages-3 ? totalPages : currentPage+2
        let pages = []
        for(let i = min; i <= max; i++) {
          let p = {
            url: pageLink(category, i),
            page: i
          }
          pages.push(p)
        }
        return pages
      }
      _.keys(this.categoryPages[category]).forEach((page) => {
        page = parseInt(page)
        let outputPath = pageLink(category, page)

        let paginator = {
          posts: this.categoryPages[category][page],
          total_pages: pages,
          current_page: page,
          pages: getPages(pages, page),
          next_page: page < pages ? pageLink(category, page+1) : "",
          previous_page: page > 1 ? pageLink(category, page-1) : ""
        }
        opts.files[outputPath] = {category, layout: this.opts.layout, paginator, site: opts.config, source: "index.html"}
      })
    })
  }
}