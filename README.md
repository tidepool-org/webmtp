# webmtp

Access devices over MTP

## Introduction

On some operating systems (e.g. macOS) devices like modern Android phones do not mount as disk drives without using external software, like Android File Transfer or OSXFUSE. `webmtp` allows Chromium-based browsers (via WebUSB, Node.js and Electron apps to read files from devices over MTP without requiring additional software or drivers.

## Usage

### Browser

```
<html>
  <head>
    <title>MTP over WebUSB</title>
    <script src="https://cdn.jsdelivr.net/npm/webmtp/mtp.min.js"></script>
    <script type="text/javascript">
    document.addEventListener('DOMContentLoaded', event => {
      let button = document.getElementById('connect');

      button.addEventListener('click', async() => {
        const mtp = new Mtp(0x0e8d, 0x201d);

        mtp.addEventListener('error', err => console.log('Error', err));

        mtp.addEventListener('ready', async () => {
          await mtp.openSession();
          const handles = await mtp.getObjectHandles();
          const objectHandle = Math.max(...handles);
          const fileName = await mtp.getFileName(objectHandle);
          await mtp.getFile(objectHandle, fileName);
          await mtp.close();
        });
      });
    });
  <body>
    <button id="connect">Connect</button>
  </body>
</html>
```

### Node.js / Electron

```
const Mtp = require('webmtp');

const mtp = new Mtp(vendorId, productId);

mtp.on('error', err => console.log('Error', err));
mtp.on('ready', async () => {
  await mtp.openSession();
  const handles = await mtp.getObjectHandles();
  const objectHandle = Math.max(...handles);
  const fileName = await mtp.getFileName(objectHandle);
  await mtp.getFile(objectHandle, fileName);
  await mtp.close();
});

TODO
```
