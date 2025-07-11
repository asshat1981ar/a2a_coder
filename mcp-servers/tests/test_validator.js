import { expect } from 'chai';
describe('MCP Validator stub', () => {
  it('loads the module', () => {
    const mod = require('../mcpdeploy.js');
    expect(mod).to.exist;
  });
});
