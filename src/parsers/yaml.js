/* 
* @Author: Mike Reich
* @Date:   2016-01-25 19:10:09
* @Last Modified 2016-01-25
*/

'use strict';

import Promise from 'bluebird';
import yaml from 'js-yaml';

let process =  (content) => {
  return new Promise.try(() => {
    var data = yaml.safeLoad(content.toString());
    return data 
  })
}

export default (app) => {
  app.get('static-site').provide('data-parser', 'yaml', process);
  app.get('static-site').provide('data-parser', 'yml', process);
}