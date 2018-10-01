# node-mtp

Access devices over MTP using Node.js

## Introduction

On some operating systems (e.g. macOS) devices like modern Android phones do not mount as disk drives without using external software, like Android File Transfer or OSXFUSE. `node-mtp` allows Node.js (v10 or higher) and Electron apps (v3.0.0 or higher) to read files from devices over MTP without requiring additional software or drivers.

`node-mtp` is an [N-API](https://nodejs.org/api/n-api.html) wrapper around the [libmtp](http://libmtp.sourceforge.net/) library. It uses version 3 of N-API which is [only available](https://nodejs.org/api/n-api.html#n_api_n_api_version_matrix) on Node v10 and higher.

## Usage

```
const mtp = require('node-mtp');

mtp.attach();

const list = mtp.getFileListing();
console.log('Files:', list);

mtp.getFile(8, 'test.jpg'); // <file id>, <destination>

mtp.release();
```

## Building

To build this on your own machine, you'll need `libmtp`:

- Ubuntu: `sudo apt-get install libmtp-dev`
- macOS: `brew install libmtp`

## Updating on Yarn/NPM

The following steps will update the module on Yarn/NPM:

- `yarn version`
- `git push && git push --tags`
- Wait for Travis to finish.
- Download the releases from Github: `prebuildify-ci download`
- `yarn publish`

Note that you need to `yarn global add prebuildify-ci` to get the prebuilds.
