/* 
* @Author: Mike Reich
* @Date:   2016-01-25 19:26:52
* @Last Modified 2016-02-29
*/

'use strict';

//import DataCollector from './collectors/data.js'
import CSVParser from './parsers/csv.js'
import JSONParser from './parsers/json.js'
import YAMLParser from './parsers/yaml.js'
import FileCollector from './collectors/file.js'
import FMProcessor from './processors/front_matter.js'
import LayoutProcessor from './processors/layouts.js'
import ContentProcessor from './processors/content.js'
import ExcerptProcessor from './processors/excerpt.js'
import IncludeProcessor from './processors/includes.js'
import CollectionProcessor from './processors/collection.js'
import OutputPathProcessor from './processors/output_path.js'
import BlogFeatures from './processors/blog_features.js'
import DataProcessor from './processors/data.js'
import Paginator from './processors/paginator.js'
import CategoryPages from './processors/category_pages.js'
import FeedGenerator from './generators/feed.js'
import SitemapGenerator from './generators/sitemap.js'
import PageGenerator from './generators/page.js'
import FileGenerator from './generators/file.js'
import StaticSite from './StaticSite'

export default (app) => {
  new CSVParser(app)
  new JSONParser(app)
  new CSVParser(app)
  new FileCollector(app)
  new FMProcessor(app)
  new BlogFeatures(app)
  new LayoutProcessor(app)
  new IncludeProcessor(app)
  new CollectionProcessor(app)
  new OutputPathProcessor(app)
  new DataProcessor(app)
  new Paginator(app)
  new CategoryPages(app)
  new ContentProcessor(app)
  new ExcerptProcessor(app)
  new FeedGenerator(app)
  new SitemapGenerator(app)
  new PageGenerator(app)
  new FileGenerator(app)
  new StaticSite(app)
}