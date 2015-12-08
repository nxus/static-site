import sinon from 'sinon'
import Promise from 'bluebird'

import { Dispatcher } from '@nxus/core'

class TestApp extends Dispatcher {
  constructor() {
    super()
    
    this.log = sinon.spy();
    this.config = {};

    this.on = sinon.spy(this.on);
    this.once = sinon.spy(this.once);

    this.await = sinon.spy();
    
    this._gather = sinon.createStubInstance(Promise);
    this._send_with = sinon.createStubInstance(Promise);
    this._send = {
      with: sinon.stub().returns(this._send_with)
    }
    this._get = {
      gather: sinon.stub().returns(this._gather),
      send: sinon.stub().returns(this._send)
    };
    this.get = sinon.stub().returns(this._get);

  }

}

export default TestApp;
