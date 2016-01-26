/* 
* @Author: Mike Reich
* @Date:   2016-01-25 19:26:52
* @Last Modified 2016-01-25 @Last Modified time: 2016-01-25 19:26:52
*/

'use strict';

import CSVParser from './parsers/csv.js'
import JSONParser from './parsers/json.js'
import YAMLParser from './parsers/yaml.js'
import Generator from './Generator'

export default (app) => {
  new CSVParser(app)
  new JSONParser(app)
  new YAMLParser(app)
  new Generator(app)
}