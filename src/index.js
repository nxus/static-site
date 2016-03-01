/* 
* @Author: Mike Reich
* @Date:   2016-01-25 19:26:52
* @Last Modified 2016-03-01
*/

'use strict';

//import DataCollector from './collectors/data.js'
//
import Promise from 'bluebird'
import filesystem from 'fs'
import StaticSite from './StaticSite'
var fs = Promise.promisifyAll(filesystem)

export default (app) => {
  let dirs = ['/parsers', '/processors', '/collectors', '/generators']
  return Promise.each(dirs, (dir) => {
    return fs.readdirAsync(fs.realpathSync(__dirname+dir)).each((f) => {
      try {
        let m = require(__dirname+dir+"/"+f)
        if(m.default) m = m.default
        new m(app)
      } catch (e) {
        app.log.warn('Could not load static-site module', e)
      }
    })
  }).then(() => {
    new StaticSite(app)
  })
}