'use strict';

import StaticSite from '../src/StaticSite';

import TestApp from '@nxus/core/lib/test/support/TestApp';

describe("StaticSite", () => {
  var staticSite;
  var app = new TestApp();

  beforeEach(() => {
    app = new TestApp();
  });
  
  describe("Load", () => {
    it("should not be null", () => StaticSite.should.not.be.null)

    it("should be instantiated", () => {
      staticSite = new StaticSite(app);
      staticSite.should.not.be.null;
    });
  });
  
  describe("Init", () => {
    beforeEach(() => {
      staticSite = new StaticSite(app);
    });

    it("should register for app lifecycle", () => {
      app.once.called.should.be.true;
      app.once.calledWith('startup').should.be.true;
    });

    it("should have opts after load", () => {
      return app.emit('load').then(() => {
        staticSite.should.have.property('opts');
        staticSite.opts.should.have.property('config')
        staticSite.opts.config.should.have.property('source', './src');
        staticSite.opts.config.should.have.property('output', './site');
      });
    });
    
    it("should send to router on launch", () => {
      return app.emit('load').then(() => {
        return app.emit('launch').then(() => {
          app.get.called.should.be.true;
          app.get.calledWith('router');
          app._get.provide.calledWith("static", "/", "./site");
        });
      });
    });
  });
});
