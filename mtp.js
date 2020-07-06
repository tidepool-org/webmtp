let isBrowser, usb, fs = null;

if (typeof navigator !== 'undefined') {
  const userAgent = navigator.userAgent.toLowerCase();
  isBrowser = userAgent.indexOf(' electron/') === -1 && typeof window !== 'undefined';
} else {
  // Node.js process
  isBrowser = false;
}

if (!isBrowser) {
  // For Node.js and Electron
  usb = require('webusb').usb;
  EventTarget = require('events');
  fs = require('fs');
} else {
  usb = navigator.usb;
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const TYPE = [
  'undefined',
  'Command Block',
  'Data Block',
  'Response Block',
  'Event Block'
];

const CODE = {
  OPEN_SESSION: { value: 0x1002, name: 'OpenSession' },
  CLOSE_SESSION: { value: 0x1003, name: 'CloseSession' },
  GET_OBJECT_HANDLES: { value: 0x1007, name: 'GetObjectHandles'},
  GET_OBJECT: { value: 0x1009, name: 'GetObject'},
  OK: { value: 0x2001, name: 'OK'},
  INVALID_PARAMETER: { value: 0x201D, name: 'Invalid parameter'},
  INVALID_OBJECTPROP_FORMAT: { value: 0xA802, name: 'Invalid_ObjectProp_Format'},
  OBJECT_FILE_NAME: { value: 0xDC07, name: 'Object file name'},
  GET_OBJECT_PROP_VALUE: { value: 0x9803, name: 'GetObjectPropValue' },
};

class Mtp extends EventTarget {
  constructor(vendorId, productId) {
    super();
    const self = this;
    self.state = 'open';
    self.transactionID = 0;

    (async () => {
      const device = await usb.requestDevice({
        filters: [
          {
            vendorId,
            productId,
          }
        ]
      });

      if (device.opened) {
          console.log('Already open');
          await device.close();
      }
      await device.open();
      console.log('Opened:', device.opened);

      if (device.configuration === null) {
        console.log('selectConfiguration');
        await device.selectConfiguration(1);
      }
      await device.claimInterface(0);

      self.device = device;
      self.isClosing = false;
      self.readLoop();
      if (isBrowser) {
        self.dispatchEvent(new Event('ready'));
      } else {
        self.emit('ready');
      }
    })().catch((error) => {
      console.log('Error during MTP setup:', error);
      if (isBrowser) {
        self.dispatchEvent(new Event('ready'));
      } else {
        self.emit('ready');
      }
      self.emit('error', error);
    });
  }

  getName(list, idx) {
    for (let i in list) {
      if (list[i].value === idx) {
        return list[i].name;
      }
    }
    return 'unknown';
  };

  buildContainerPacket(container) {
    // payload parameters are always 4 bytes in length
    let packetLength = 12 + (container.payload.length * 4);

    const buf = new ArrayBuffer(packetLength);
    const bytes = new DataView(buf);
    bytes.setUint32(0, packetLength, true);
    bytes.setUint16(4, container.type, true);
    bytes.setUint16(6, container.code, true);
    bytes.setUint32(8, this.transactionID, true);

    container.payload.forEach((element, index) => {
      bytes.setUint32(12 + (index * 4), element, true);
    });

    this.transactionID += 1;

    console.log('Sending', buf);
    return buf;
  }

  parseContainerPacket(bytes, length) {
    const fields = {
      type : TYPE[bytes.getUint16(4, true)],
      code : this.getName(CODE, bytes.getUint16(6, true)),
      transactionID : bytes.getUint32(8, true),
      payload: bytes.buffer.slice(12),
      parameters: [],
    };

    for (let i = 12; i < length; i += 4) {
      if (i <= length - 4) {
        fields.parameters.push(bytes.getUint32(i, true));
      }
    }

    console.log(fields);
    return fields;
  }

  async readLoop() {
    let result;

    try {
      // TODO: read multiple times instead of one big buffer
      result = await this.device.transferIn(0x01, 8000);
    } catch (error) {
      if (error.message.indexOf('LIBUSB_TRANSFER_NO_DEVICE')) {
        console.log('Device disconnected');
        this.isClosing = true;
      } else {
        console.log('Error reading data:', error);
      }
    };

    if (result && result.data && result.data.byteLength && result.data.byteLength > 0) {
      const uint8buffer = new Uint8Array(result.data.buffer);
      const bytes = new DataView(result.data.buffer);
      const length = bytes.getUint32(0, true);
      const totalLength = result.data.byteLength;

      console.log('Length:', length);
      console.log(result.data.buffer);

      // raw = new ArrayBuffer(totalLength + incoming.data.byteLength);
      // raw.set(buf);
      // raw.set(incoming.data, totalLength);
      // totalLength += incoming.data.byteLength;
      // console.log('Full buffer is now:', raw);

      if (isBrowser) {
        this.dispatchEvent(new CustomEvent('data', { detail: this.parseContainerPacket(bytes, length) }));
      } else {
        this.emit('data', this.parseContainerPacket(bytes, length));
      }
    }

    if (!this.isClosing && this.device.opened) {
      this.readLoop();
    }
  };

  async writeAsync(buffer) {
    return await this.device.transferOut(0x01, buffer);
  }

  async closeAsync() {
    this.isClosing = true;
    try {

      console.log('Closing session..');
      const closeSession = {
        type: 1, // command block
        code: CODE.CLOSE_SESSION.value,
        payload: [1], // session ID
      };
      await this.writeAsync(this.buildContainerPacket(closeSession));

      await this.device.releaseInterface(0);
      await this.device.close();
      if (!isBrowser) {
        this.removeAllListeners();
      }
      console.log('Closed device');
    } catch(err) {
      console.log('Error:', err);
    }
  }

  async dataHandler(data) {
    switch (this.state) {
      case 'open':
        console.log('Getting object handles..');
        const getObjectHandles = {
          type: 1, // command block
          code: CODE.GET_OBJECT_HANDLES.value,
          payload: [0xFFFFFFFF, 0, 0xFFFFFFFF], // get all
        };
        await this.writeAsync(this.buildContainerPacket(getObjectHandles, 4));
        this.state = 'handles';
        break;
      case 'handles':
        if (data.type === 'Data Block') {

          data.parameters.shift(); // Remove length element

          data.parameters.forEach( element => {
            console.log('Object handle', element);
          });

          this.objectHandle = Math.max(...data.parameters);

          console.log('Getting file name..');
          const getFilename = {
            type: 1,
            code: CODE.GET_OBJECT_PROP_VALUE.value,
            payload: [this.objectHandle, CODE.OBJECT_FILE_NAME.value], // objectHandle and objectPropCode
          };
          await this.writeAsync(this.buildContainerPacket(getFilename));
          this.state = 'filename';
        }
        break;
      case 'filename':
        if (data.type === 'Data Block') {
          const array = new Uint8Array(data.payload);
          const decoder = new TextDecoder('utf-16le');
          this.filename = decoder.decode(array.subarray(1, array.byteLength - 2));
          console.log('Filename:', this.filename);

          console.log('Getting file..');
          const getFile = {
            type: 1,
            code: CODE.GET_OBJECT.value,
            payload: [this.objectHandle],
          };
          await this.writeAsync(this.buildContainerPacket(getFile));
          this.state = 'file';
        }
        break;
      case 'file':
        if (data.type === 'Data Block') {
          const array = new Uint8Array(data.payload);

          if (isBrowser) {
            var file = new Blob([array]);
            const a = document.createElement('a'),
                url = URL.createObjectURL(file);
            a.href = url;
            a.download = this.filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 0);
          } else {
            fs.writeFileSync(this.filename, array);
          }

          this.state = 'close';
        }
        break;
      case 'close':
        await this.closeAsync();
        break;
    }
  }

  async openSession() {
    console.log('Opening session..');
    const openSession = {
      type: 1, // command block
      code: CODE.OPEN_SESSION.value,
      payload: [1], // session ID
    };
    let data = this.buildContainerPacket(openSession);
    let result = await this.writeAsync(data);
    console.log('Result:', result);

    await delay(2000); // wait for send/receive to complete
  }
}



const initMTP = () => {
  const mtp = new Mtp(0x0e8d, 0x201d);

  if (isBrowser) {
    mtp.addEventListener('error', err => console.log('Error', err));

    mtp.addEventListener('ready', async () => {
      mtp.addEventListener('data', (event) => mtp.dataHandler(event.detail));
      await mtp.openSession();
    } );
  } else {
    mtp.on('error', err => console.log('Error', err));
    mtp.on('ready', async () => {
      mtp.on('data', (data) => mtp.dataHandler(data));
      await mtp.openSession();
    });
  }
};

if (isBrowser) {
  document.addEventListener('DOMContentLoaded', event => {
    let button = document.getElementById('connect');

    button.addEventListener('click', async() => {
      initMTP();
    });
  });

} else {
  initMTP();
}
