# webmtp

Access devices over MTP

## Introduction

On some operating systems (e.g. macOS) devices like modern Android phones do not mount as disk drives without using external software, like Android File Transfer or OSXFUSE. `webmtp` allows Chromium-based browsers (via WebUSB), Node.js and Electron apps to read files from devices over MTP without requiring additional software or drivers.

## Usage

### Browser

```
<html>
  <head>
    <title>MTP over WebUSB</title>
    <script type="module">
      import Mtp from 'https://cdn.jsdelivr.net/npm/webmtp/mtp.min.js';

      document.addEventListener('DOMContentLoaded', event => {
        let button = document.getElementById('connect');

        button.addEventListener('click', async() => {
          const mtp = new Mtp(vendorId, productId);

          mtp.addEventListener('error', err => console.log('Error', err));

          mtp.addEventListener('ready', async () => {
            await mtp.openSession();
            const handles = await mtp.getObjectHandles();
            const objectHandle = Math.max(...handles);
            const fileName = await mtp.getFileName(objectHandle);
            const array = await mtp.getFile(objectHandle, fileName);
            await mtp.close();

            const file = new Blob([array]);
            const a = document.createElement('a'),
                url = URL.createObjectURL(file);
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
          });
        });
      });
    </script>
  </head>
  <body>
    <button id="connect">Connect</button>
  </body>
</html>
```

### Node.js / Electron

```
import Mtp from 'webmtp';
import fs from 'fs';

const mtp = new Mtp(vendorId, productId);

mtp.addEventListener('error', err => console.log('Error', err));
mtp.addEventListener('ready', async () => {
  await mtp.openSession();
  const handles = await mtp.getObjectHandles();
  const objectHandle = Math.max(...handles);
  const fileName = await mtp.getFileName(objectHandle);
  const array = await mtp.getFile(objectHandle, fileName);
  fs.writeFileSync(fileName, array);
  await mtp.close();
});
```

Note: If you already have a `USBDevice` object returned from `navigator.usb.requestDevices()` or `navigator.usb.getDevices()`, you can pass that in as a third parameter to the constructor, e.g. `const mtp = new Mtp(vendorId, productId, usbDevice)` or even `const mtp = new Mtp(null, null, usbDevice)`. `webmtp` will use that `USBDevice` instead.
