const binding = require('node-gyp-build')(__dirname);

var list = binding.getFileListing();
console.log('Files:', list);

console.log('Test 1');
binding.getFile(8, 'test.ibf');

console.log('Test 2');
var fd = 0;
binding.getFile(8, fd);
console.log('FD:', fd);
//binding.close();

module.exports = binding;
