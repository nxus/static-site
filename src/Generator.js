/* 
* @Author: Mike Reich
* @Date:   2015-11-06 16:45:04
* @Last Modified 2015-11-17
*/

'use strict';

import _ from 'underscore'
import util from 'util'
import fs from 'fs'
import fse from 'fs-extra';
import glob from 'glob';
import async from 'async';
import fm from 'front-matter';

import node_path from 'path';
import moment from 'moment-strftime';
import slug from 'limax';

import yaml from 'js-yaml';
import parse from 'fast-csv';

const _defaultOpts = {
  source: './src',
  output: './site',
  data: {},
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
  "html": "html"
}

const REGEX_FILE = /[^\/]$/;

var app;

class Generator {
  constructor (a, loaded) {
    app = a;
    app.log('Init Static Site Generator')

    app.on('app.load', () => {
      this.opts = _.extend(_defaultOpts, app.config.staticSite);
    })

    app.on('app.startup', () => {
      app.log('Static Site Generator Startup')
      app.log('Generating Static Files')

      fse.remove(this.opts.output, () => {
        fse.ensureDirSync(this.opts.output);
        this._process();
      });      
    })

    app.on('app.launch', () => {
      app.emit('router.setStatic', "/", this.opts.output)
    })
  }

  _process() {
    async.series([
      this._processDataFiles.bind(this),
      this._processLayoutFiles.bind(this),
      this._processRegularFiles.bind(this),
      this._processCollectionFiles.bind(this)
    ], () => {app.log('Done generating content')});
  }

  _processDataFiles (callback) {
    var src = fs.realpathSync(this.opts.source);
    var chain = [];
    this._getFiles(src, "_data/*", (err, files) => {
      files.forEach((file) => {
        if(node_path.basename(file)[0] != ".") chain.push((cb) => this._processDataFile(node_path.join(src, file), cb));
      })
      async.series(chain, callback);
    });
  }

  _processDataFile(file, cb) {
    //read file
    var data = {};
    var content = fs.readFileSync(file);
    var ext = node_path.extname(file);
    try {
      if(ext == ".csv") {
        data = [];
        parse
         .fromString(content, {headers: true})
         .on("data", (d) => {
             data.push(d)
         })
         .on("end", () => {
            this.opts.data[node_path.basename(file, ext)] = data;
            cb()
         });
      } else if(ext == ".yaml" || ext == ".yml") {
        data = yaml.safeLoad(content.toString());
        this.opts.data[node_path.basename(file, ext)] = data;
        cb()
      } else if(ext == ".json") {
        data = JSON.parse(content.toString());
        this.opts.data[node_path.basename(file, ext)] = data;
        cb()
      } else {
        cb()
      }
    } catch (e) {
      app.log.error(e)
      cb()
    } 
  }

  _processLayoutFiles (callback) {
    this._layouts = {}
    var src = fs.realpathSync(this.opts.source);
    this._getFiles(src, "_layouts/*", (err, files) => {
      files.forEach((file) => {
        if(node_path.basename(file)[0] == ".") return;
        var name = node_path.basename(file.replace("_layouts/", ""), node_path.extname(file));
        var opts = this._getFrontMatter(node_path.join(src, file));
        opts.type = node_path.extname(file).replace(".", "")
        this._layouts[name] = opts;
      })
      this._postProcessLayoutFiles(callback);
    });
  }

  _postProcessLayoutFiles (callback) {
    var chain = [];
    _.each(this._layouts, (layout, name) => {
      if(layout.attributes && layout.attributes.template) chain.push((cb) => this._postProcessLayoutFile(name, layout, cb))
    })
    async.series(chain, callback)
  }

  _postProcessLayoutFile (name, layout, callback) {
    this._renderLayout(layout.type, layout.body, layout.attributes, (err, content) => {
      var layoutCopy = this._layouts[name];
      layoutCopy.body = content;
      this._layouts[name] = layoutCopy;
      callback();
    })
  }

  _processRegularFiles (callback) {
    var src = fs.realpathSync(this.opts.source);
    var dest = fs.realpathSync(this.opts.output);
    var chain = [];
    this._getFiles(src, "**/*", "_*/*", (err, files) => {
      files.forEach((file) => {
        if(node_path.basename(file)[0] != ".") chain.push((cb) => this._processRegularFile(src, dest, file, cb));
      })
      async.series(chain, callback);
    });
  }

  _processRegularFile(path, dest, file, cb) {
    var src = node_path.join(path, file);
    var ext = node_path.extname(file).replace(".", "");
    var parsedPage = this._getFrontMatter(src);
    var pageOpts = {page: parsedPage.attributes, site: this.opts};
    dest = node_path.join(dest, this._generateOutputPath(file, pageOpts));
    console.log('copying regular file '+src+" to "+dest);

    // run file through template
    var body = parsedPage.body || "";

    if(_.contains(_.keys(_renderExtensions), ext)) {
      this._renderContent(ext, body, pageOpts, (err, content) => {
        fse.outputFile(dest, content, cb);
      })
    } else {
      fse.copy(src, dest, cb);
    }
  }

  _processCollectionFiles (callback) {
    var src = fs.realpathSync(this.opts.source);
    var dest = fs.realpathSync(this.opts.output);
    var chain = [];
    this._getFiles(src, "_*/*", (err, files) => {
      files.forEach((file) => {
        var name = file.split(node_path.sep)[0]
        if(_.contains(_.keys(this.opts.collections), name))
          if(node_path.basename(file)[0] != ".") chain.push((cb) => this._processCollectionFile(src, dest, file, cb));
      })
      async.series(chain, callback);
    });
  }

  _processCollectionFile (path, dest, file, cb) {
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

    this._renderContent(ext, body, pageOpts, (err, content) => {
      fse.outputFile(dest, content, cb);
    })
    // write file to new destination
  }

  _render (type, content, opts, cb) {
    if(opts.page.filename) opts.filename = opts.page.filename
    app.emit('renderer.render', type, content, opts, cb);
  }

  _renderContent (type, content, opts, cb) {
    if(!opts.page.layout) opts.page.layout = 'default';
    var body = this._layouts[opts.page.layout].body;
    var t = this._layouts[opts.page.layout].type;
    this._render(type, content, opts, (err, rContent) => {
      opts.content = rContent
      this._renderLayout(t, body, opts, cb);
    })
  }

  _renderLayout (type, content, opts, cb) {
    this._render(type, content, opts, cb);
  }

  _getFrontMatter(src) {
    var opts = fm(fs.readFileSync(src).toString())
    opts.attributes.filename = fs.realpathSync(node_path.join(this.opts.source, "./_includes/"))+"/.";
    return opts;
  }

  _generateOutputPath (to, opts) {
    var ext = node_path.extname(to);
    if(opts.permalink) {
      var permalink = opts.permalink.replace("%title", (opts.title ? "["+slug(opts.title)+"]" : ""))
      to = moment(opts.published).strftime(permalink);
    }
    var newExt = "html"
    if(ext && _.contains(_.keys(_renderExtensions), ext.replace(".", ""))) {
      if(_renderExtensions[ext.replace(".", "")]) newExt = _renderExtensions[ext.replace(".", "")];
      to = to.replace(ext, "");
      to = to+"."+newExt;
    }
    return to
  }

  _getFiles(src, pattern, ignore, callback) {
    var opts = {
      cwd: src,
      dot: true,
      mark: true
    }

    if(!callback) 
      callback = ignore
    else 
      opts.ignore = ignore

    glob(pattern, opts, (err, files) => {
      if (err) {
        return callback(err);
      }
      files = files.filter(REGEX_FILE.test, REGEX_FILE);
      callback(null, files);
    });
  }
}

export default Generator