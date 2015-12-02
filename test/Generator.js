'use strict';

var Generator = require('../src/Generator');

var should = require('should');

describe("Generator", () => {
  var generator;
    
  describe("Load", () => {
    it("should not be null", () => Generator.should.not.be.null())

    it("should be instantiated", () => (generator = new Generator()).should.not.be.null())
  });
});
