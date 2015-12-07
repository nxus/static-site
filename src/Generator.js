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
import fm from 'front-matter';

import node_path from 'path';
import moment from 'moment-strftime';
import slug from 'limax';

import yaml from 'js-yaml';
import parse from 'fast-csv';

import Promise from 'bluebird';
Promise.promisifyAll(fse);
var globAsync = Promise.promisify(glob);

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

class Generator {
  constructor (app) {
    this.app = app;
    app.log('Init Static Site Generator')

    app.once('load', () => {
      this.opts = _.extend(_defaultOpts, app.config.staticSite);
    })

    app.once('startup', () => {
      app.log('Static Site Generator Startup')
      app.log('Generating Static Files')

      return fse.removeAsync(this.opts.output).then(() => {
        fse.ensureDirSync(this.opts.output);
        return this._process();
      });
    })

    app.once('launch', () => {
      app.get('router').send('setStatic').with("/", this.opts.output);
    })
  }

  _process() {
    return this._processDataFiles()
      .then(this._processLayoutFiles.bind(this))
      .then(this._processRegularFiles.bind(this))
      .then(this._processCollectionFiles.bind(this))
      .then( () => {this.app.log('Done generating content')} );
  }

  _processDataFiles () {
    var src = fs.realpathSync(this.opts.source);
    var chain = [];
    return this._getFiles(src, "_data/*").then( (files) => {
      files.forEach((file) => {
        if(node_path.basename(file)[0] != ".") chain.push(this._processDataFile(node_path.join(src, file)));
      })
      return Promise.all(chain);
    });
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
      return this._postProcessLayoutFiles();
    });
  }

  _postProcessLayoutFiles () {
    var chain = [];
    _.each(this._layouts, (layout, name) => {
      if(layout.attributes && layout.attributes.template) chain.push(this._postProcessLayoutFile(name, layout));
    })
    return Promise.all(chain);
  }

  _postProcessLayoutFile (name, layout) {
    return this._renderLayout(layout.type, layout.body, layout.attributes).then( (content) => {
      var layoutCopy = this._layouts[name];
      layoutCopy.body = content;
      this._layouts[name] = layoutCopy;
    });
  }

  _processRegularFiles () {
    var src = fs.realpathSync(this.opts.source);
    var dest = fs.realpathSync(this.opts.output);
    var chain = [];
    return this._getFiles(src, "**/*", "_*/*").then( (files) => {
      files.forEach((file) => {
        if(node_path.basename(file)[0] != ".") chain.push(this._processRegularFile(src, dest, file));
      })
      return Promise.all(chain);
    });
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
    return this.app.get('renderer').emit('render').with(type, content, opts).spread((result) => { return result; });
  }

  _renderContent (type, content, opts) {
    if(!opts.page.layout) opts.page.layout = 'default';
    var body = this._layouts[opts.page.layout].body;
    var t = this._layouts[opts.page.layout].type;
    return this._render(type, content, opts).then( (rContent) => {
      opts.content = rContent
      return this._renderLayout(t, body, opts);
    });
  }

  _renderLayout (type, content, opts) {
    return this._render(type, content, opts);
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
