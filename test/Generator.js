'use strict';

import Generator from '../src/Generator';

import TestApp from '@nxus/core/lib/test/support/TestApp';

describe("Generator", () => {
  var generator;
  var app = new TestApp();

  beforeEach(() => {
    app = new TestApp();
  });
  
  describe("Load", () => {
    it("should not be null", () => Generator.should.not.be.null)

    it("should be instantiated", () => {
      generator = new Generator(app);
      generator.should.not.be.null;
    });
  });
  
  describe("Init", () => {
    beforeEach(() => {
      generator = new Generator(app);
    });

    it("should register for app lifecycle", () => {
      app.once.called.should.be.true;
      app.once.calledWith('startup').should.be.true;
    });

    it("should have opts after load", () => {
      return app.emit('load').then(() => {
        generator.should.have.property('opts');
        generator.opts.should.have.property('source', './src');
        generator.opts.should.have.property('output', './site');
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
