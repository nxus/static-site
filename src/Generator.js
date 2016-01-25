/* 
* @Author: Mike Reich
* @Date:   2015-11-06 16:45:04
* @Last Modified 2016-01-24
*/

'use strict';

import _ from 'underscore'
import underscoreDeepExtend from 'underscore-deep-extend'
import util from 'util'
import fs from 'fs'
import fse from 'fs-extra';
import glob from 'glob';
import fm from 'yaml-front-matter';

import node_path from 'path';
import moment from 'moment-strftime';
import slug from 'limax';

import yaml from 'js-yaml';
import parse from 'fast-csv';

import Promise from 'bluebird';
Promise.promisifyAll(fse);
var globAsync = Promise.promisify(glob);

_.mixin({deepExtend: underscoreDeepExtend(_)});

const _defaultOpts = {
  source: './src',
  output: './site',
  data: {},
  tags: [],
  collections: {
    "_posts": {
      permalink: "/[blog]/%y/%m/%d/%title"
    }
  },
  ignore: []
}

const _renderExtensions = {
  "md": "html",
  "ejs": "html",
  "html": "html",
  "markdown": "html"
}

const REGEX_FILE = /[^\/]$/;

class Generator {
  constructor (app) {
    this.app = app;
    app.log('Init Static Site Generator')

    this.opts = _.deepExtend(_defaultOpts, app.config.staticSite);

    fse.ensureDirSync(this.opts.output);
    app.get('router').provide('static', "/", fs.realpathSync(this.opts.output));

    app.once('startup', () => {
      app.log('Static Site Generator Startup')
      app.log('Generating Static Files,')

      return this._process();
    })
  }

  _process() {
    if(!fs.existsSync(this.opts.source)) throw new Error('Source destination does not exist!')
    return this._processDataFiles()
      .then(this._preprocessCollectionFiles.bind(this))
      .then(this._processLayoutFiles.bind(this))
      .then(this._processRegularFiles.bind(this))
      .then(this._processCollectionFiles.bind(this))
      .then( () => {this.app.log('Done generating content')} );
  }

  _preprocessCollectionFiles () {
    var src = fs.realpathSync(this.opts.source);
    var dest = fs.realpathSync(this.opts.output);
    var chain = [];
    return this._getFiles(src, "_*/*").then( (files) => {
      files.forEach((file) => {
        var name = file.split(node_path.sep)[0]
        if(_.contains(_.keys(this.opts.collections), name)) {
          if(node_path.basename(file)[0] != ".") {
            var newName = name;
            if(newName[0] == "_") newName = newName.slice(1, newName.length)
            if(!this.opts[newName]) this.opts[newName] = [];
            var mdata = this._preprocessCollectionFile(src, dest, file)
            if(mdata.tags) this.opts.tags = this.opts.tags.concat(mdata.tags)
            if(this.opts.collections[name].permalink) mdata.permalink = this.opts.collections[name].permalink
            mdata.url = this._generateOutputPath(file, mdata)
            this.opts[newName].push(mdata);
          }
        }
      })
    });
  }

  _preprocessCollectionFile (path, dest, file) {
    // set new destination name
    var src = node_path.join(path, file);
    var collection = file.split(node_path.sep)[0];
    var ext = node_path.extname(file).replace(".", "");
    var parsedPage = this._getFrontMatter(src);
    parsedPage.attributes.excerpt = parsedPage.body.replace(/(<([^>]+)>)/ig, "").substr(0, 200)+"..."
    return parsedPage.attributes
    // write file to new destination
  }

  _processDataFiles () {
    var src = fs.realpathSync(this.opts.source);
    var chain = [];
    return this._getFiles(src, "_data/*").then( (files) => {
      files.forEach((file) => {
        if(node_path.basename(file)[0] != ".") chain.push(this._processDataFile(node_path.join(src, file)));
      })
      return Promise.all(chain);
    }).catch( (e) => this.app.log.debug(e));
  }

  _processDataFile(file) {
    //read file
    var data = {};
    var content = fs.readFileSync(file);
    var ext = node_path.extname(file);
    return Promise.try(() => {
      if(ext == ".csv") {
        data = [];
        return new Promise((resolve, reject) => {
          var p = parse.fromString(content, {headers: true});
          p.on("data", (d) => {
            data.push(d)
          });
          p.on("end", () => {
            this.opts.data[node_path.basename(file, ext)] = data;
            resolve();
          });
          p.on("error", (e) => {
            reject(e);
          })
        });
      } else if(ext == ".yaml" || ext == ".yml") {
        data = yaml.safeLoad(content.toString());
        this.opts.data[node_path.basename(file, ext)] = data;
      } else if(ext == ".json") {
        data = JSON.parse(content.toString());
        this.opts.data[node_path.basename(file, ext)] = data;
      }
    }).catch((e) => {
      this.app.log.error(e)
    });
  }

  _processLayoutFiles () {
    this._layouts = {}
    var src = fs.realpathSync(this.opts.source);
    return this._getFiles(src, "_layouts/*").then((files) => {
      files.forEach((file) => {
        if(node_path.basename(file)[0] == ".") return;
        var name = node_path.basename(file.replace("_layouts/", ""), node_path.extname(file));
        var opts = this._getFrontMatter(node_path.join(src, file));
        opts.type = node_path.extname(file).replace(".", "")
        this._layouts[name] = opts;
      })
      //return this._postProcessLayoutFiles();
    }).catch( (e) => this.app.log.debug(e));
  }

  // _postProcessLayoutFiles () {
  //   var chain = [];
  //   _.each(this._layouts, (layout, name) => {
  //     if(layout.attributes && layout.attributes.template) chain.push(this._postProcessLayoutFile(name, layout));
  //   })
  //   return Promise.all(chain);
  // }

  // _postProcessLayoutFile (name, layout) {
  //   return this._render(layout.type, layout.body, layout.attributes).then( (content) => {
  //     var layoutCopy = this._layouts[name];
  //     layoutCopy.body = content;
  //     this._layouts[name] = layoutCopy;
  //   });
  // }

  _processRegularFiles () {
    var src = fs.realpathSync(this.opts.source);
    var dest = fs.realpathSync(this.opts.output);
    var chain = [];
    return this._getFiles(src, "**/*", "_*/*").then( (files) => {
      files.forEach((file) => {
        if(node_path.basename(file)[0] != ".") chain.push(this._processRegularFile(src, dest, file));
      })
      return Promise.all(chain);
    }).catch( (e) => this.app.log.debug(e));
  }

  _processRegularFile(path, dest, file) {
    var src = node_path.join(path, file);
    var ext = node_path.extname(file).replace(".", "");
    var parsedPage = this._getFrontMatter(src);
    var pageOpts = {page: parsedPage.attributes, site: this.opts};
    dest = node_path.join(dest, this._generateOutputPath(file, pageOpts));
    console.log('copying regular file '+src+" to "+dest);

    // run file through template
    var body = parsedPage.body || "";

    if(_.contains(_.keys(_renderExtensions), ext)) {
      return this._renderContent(ext, body, pageOpts).then((content) => {
        return fse.outputFileAsync(dest, content);
      })
    } else {
      return fse.copyAsync(src, dest);
    }
  }

  _processCollectionFiles () {
    var src = fs.realpathSync(this.opts.source);
    var dest = fs.realpathSync(this.opts.output);
    var chain = [];
    this._getFiles(src, "_*/*").then( (files) => {
      files.forEach((file) => {
        var name = file.split(node_path.sep)[0]
        if(_.contains(_.keys(this.opts.collections), name))
          if(node_path.basename(file)[0] != ".") chain.push(this._processCollectionFile(src, dest, file));
      })
      return Promise.all(chain);
    });
  }

  _processCollectionFile (path, dest, file) {
    // set new destination name
    var src = node_path.join(path, file);
    var collection = file.split(node_path.sep)[0];
    var ext = node_path.extname(file).replace(".", "");
    var parsedPage = this._getFrontMatter(src);
    var collectionOpts = this.opts.collections[collection]
    collectionOpts.name = collection
    parsedPage.attributes.collection = collectionOpts
    var pageOpts = {site: this.opts, page: parsedPage.attributes};
    if(file[0] == "_")
      file = file.slice(1, file.length);
    dest = node_path.join(dest, this._generateOutputPath(file, pageOpts));
    console.log('copying collection '+src+" to "+dest);

    // run file through template
    var body = parsedPage.body || "";

    return this._renderContent(ext, body, pageOpts).then((content) => {
      return fse.outputFileAsync(dest, content);
    })
    // write file to new destination
  }

  _render (type, content, opts) {
    if(opts.page.filename) opts.filename = opts.page.filename
    return this.app.get('renderer').request('render', type, content, opts).then((result) => { return result; });
  }

  _renderContent (type, content, opts) {
    if(!opts.page.layout) opts.page.layout = 'default';
    return this._renderWithLayout(type, content, opts)
  }

  _renderWithLayout (type, content, opts) {
    return this._render(type, content, opts).then((c) => {
      if(opts.page.layout && this._layouts[opts.page.layout]) {
        var layout = this._layouts[opts.page.layout]
        opts.content = c
        opts.page = _.deepExtend(opts.page, layout.attributes)
        if(!layout.attributes.layout) delete opts.page.layout
        return this._renderWithLayout(layout.type, layout.body, opts)
      } else {
        return c;
      }
    })
  }

  _getFrontMatter(src) {
    var content = fs.readFileSync(src).toString()
    var opts = {attributes: null, body: null}
    opts.attributes = content ? fm.loadFront(content, "content") : {}
    opts.body = opts.attributes.content
    if(fs.existsSync(node_path.join(this.opts.source, "./_includes/")))
      opts.attributes.filename = fs.realpathSync(node_path.join(this.opts.source, "./_includes/"))+"/.";
    return opts;
  }

  _generateOutputPath (to, opts) {
    var ext = node_path.extname(to);
    if(opts.permalink || (opts.page && (opts.page.permalink || (opts.page.collection && opts.page.collection.permalink)))) {
      var permalink = opts.permalink;
      var title = opts.title || opts.page.title || 'index'
      if(opts.page && opts.page.collection && opts.page.collection.permalink) permalink = opts.page.collection.permalink
      if(opts.page && opts.page.permalink) permalink = opts.page.permalink
      permalink = permalink.replace("%title", (title ? "["+slug(title)+"]" : ""))
      to = moment(opts.published).strftime(permalink);
    }
    var newExt = "html"
    if(ext && _.contains(_.keys(_renderExtensions), ext.replace(".", ""))) {
      if(_renderExtensions[ext.replace(".", "")]) newExt = _renderExtensions[ext.replace(".", "")];
      to = to.replace(ext, "");
      to = to+"."+newExt;
    }
    console.log('outputpath', to)
    return to
  }

  _getFiles(src, pattern, ignore) {
    var opts = {
      cwd: src,
      dot: true,
      mark: true
    }

    opts.ignore = ignore

    return globAsync(pattern, opts).then((files) => {
      return files.filter(REGEX_FILE.test, REGEX_FILE);
    });
  }
}

export default Generator
