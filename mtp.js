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
  usb = navigator.usb; // Yay, we're using WebUSB!
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
    self.device = null;

    (async () => {

      let devices = await usb.getDevices();
      for (const device of devices) {
        if (device.productId === productId && device.vendorId === vendorId) {
          self.device = device;
        }
      };

      if (self.device === null) {
        self.device = await usb.requestDevice({
          filters: [
            {
              vendorId,
              productId,
            }
          ]
        });
      }

      if (self.device != null) {
        if (self.device.opened) {
            console.log('Already open');
            await self.device.close();
        }
        await self.device.open();
        console.log('Opened:', self.device.opened);

        if (self.device.configuration === null) {
          console.log('selectConfiguration');
          await self.device.selectConfiguration(1);
        }
        await self.device.claimInterface(0);

        if (isBrowser) {
          self.dispatchEvent(new Event('ready'));
        } else {
          self.emit('ready');
        }
      } else {
        throw new Error('No device available.');
      }
    })().catch((error) => {
      console.log('Error during MTP setup:', error);
      if (isBrowser) {
        self.dispatchEvent(new Event('error'));
      } else {
        self.emit('error', error);
      }
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

  async read() {
    let result;

    try {
      // TODO: read multiple times instead of one big buffer
      result = await this.device.transferIn(0x01, 8000);
    } catch (error) {
      if (error.message.indexOf('LIBUSB_TRANSFER_NO_DEVICE')) {
        console.log('Device disconnected');
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

      return this.parseContainerPacket(bytes, length);
    }
  }

  async readData() {
    let type = null;
    let result = null;

    while (type !== 'Data Block') {
      result = await this.read();
      type = result.type;
    }

    return result;
  }

  async write(buffer) {
    return await this.device.transferOut(0x01, buffer);
  }

  async close() {
    try {
      console.log('Closing session..');
      const closeSession = {
        type: 1, // command block
        code: CODE.CLOSE_SESSION.value,
        payload: [1], // session ID
      };
      await this.write(this.buildContainerPacket(closeSession));

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

  async openSession() {
    console.log('Opening session..');
    const openSession = {
      type: 1, // command block
      code: CODE.OPEN_SESSION.value,
      payload: [1], // session ID
    };
    let data = this.buildContainerPacket(openSession);
    let result = await this.write(data);
    console.log('Result:', result);
    console.log(await this.read());
  }

  async getObjectHandles() {
    console.log('Getting object handles..');
    const getObjectHandles = {
      type: 1, // command block
      code: CODE.GET_OBJECT_HANDLES.value,
      payload: [0xFFFFFFFF, 0, 0xFFFFFFFF], // get all
    };
    await this.write(this.buildContainerPacket(getObjectHandles, 4));
    const data = await this.readData();

    data.parameters.shift(); // Remove length element

    data.parameters.forEach( element => {
      console.log('Object handle', element);
    });

    return data.parameters;
  }

  async getFileName(objectHandle) {
    console.log('Getting file name with object handle', objectHandle);
    const getFilename = {
      type: 1,
      code: CODE.GET_OBJECT_PROP_VALUE.value,
      payload: [objectHandle, CODE.OBJECT_FILE_NAME.value], // objectHandle and objectPropCode
    };
    await this.write(this.buildContainerPacket(getFilename));
    const data = await this.readData();

    const array = new Uint8Array(data.payload);
    const decoder = new TextDecoder('utf-16le');
    const filename = decoder.decode(array.subarray(1, array.byteLength - 2));
    console.log('Filename:', filename);
    return filename;
  }

  async getFile(objectHandle, filename) {
    console.log(`Getting file with object handle ${objectHandle} as ${filename}`);
    const getFile = {
      type: 1,
      code: CODE.GET_OBJECT.value,
      payload: [objectHandle],
    };
    await this.write(this.buildContainerPacket(getFile));
    const data = await this.readData();

    return new Uint8Array(data.payload);
  }
}

if(!isBrowser) {
  module.exports = Mtp;
}
