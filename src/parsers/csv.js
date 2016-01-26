/* 
* @Author: Mike Reich
* @Date:   2016-01-25 19:08:44
* @Last Modified 2016-01-25
*/

'use strict';

import parse from 'fast-csv';
import Promise from 'bluebird';

let process = (content) => {
  return Promise.try(() => {
    return new Promise((resolve, reject) => {
      var data = [];
      var p = parse.fromString(content, {headers: true});
      p.on("data", (d) => {
        data.push(d)
      });
      p.on("end", () => {
        resolve(data);
      });
      p.on("error", (e) => {
        reject(e);
      })
    });
  });
}

export default (app) => {
  app.get('static-site').provide('data-parser', 'csv', process);
}

