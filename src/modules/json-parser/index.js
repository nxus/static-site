/* 
* @Author: Mike Reich
* @Date:   2016-01-25 19:09:59
* @Last Modified 2016-01-25
*/

'use strict';

import Promise from 'bluebird';

let process = (content) => {
  return new Promise.try(() => {
    var data = JSON.parse(content.toString()); 
    return data
  })
}

export default (app) => {
  app.get('static-site').provide('data-parser', 'json', process);
}