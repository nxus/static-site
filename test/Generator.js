'use strict';

var Generator = require('../src/Generator');

var TestApp = require('./support/TestApp');

describe("Generator", () => {
  var generator;
  var app;

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
      app.on.called.should.be.true;
      app.on.calledWith('load').should.be.true;
      app.on.calledWith('startup').should.be.true;
      app.on.calledWith('launch').should.be.true;
    });

    it("should have opts after load", () => {
      return app.emit('load').with().then(() => {
        generator.should.have.property('opts');
        generator.opts.should.have.property('source', './src');
        generator.opts.should.have.property('output', './site');
      });
    });
    
    it("should send to router on launch", () => {
      return app.emit('load').with().then(() => {
        return app.emit('launch').with().then(() => {
          app.get.called.should.be.true;
          app.get.calledWith('router');
          app._send.with.calledWith("/", "./site");
        });
      });
    });
  });
});
