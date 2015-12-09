/* 
* @Author: Mike Reich
* @Date:   2015-11-06 16:41:51
* @Last Modified 2015-11-06 @Last Modified time: 2015-11-06 16:41:51
*/

'use strict';

var Generator = require('./lib/Generator')

module.exports = function(app, loaded) {
  new Generator(app);
}
