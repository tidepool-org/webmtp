const binding = require('node-gyp-build')(__dirname);

//binding.connect();
/*
var list = binding.getFileListing();
console.log('Files:', list);

console.log('Test 1');
binding.getFile(8, 'test.ibf');
*/
//binding.close();

module.exports = binding;
