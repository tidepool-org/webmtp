const Mtp = require('./mtp.js');
const fs = require('fs');

const mtp = new Mtp(0x0e8d, 0x201d);

mtp.on('error', err => console.log('Error', err));
mtp.on('ready', async () => {
  await mtp.openSession();
  const handles = await mtp.getObjectHandles();
  const objectHandle = Math.max(...handles);
  const fileName = await mtp.getFileName(objectHandle);
  const array = await mtp.getFile(objectHandle, fileName);
  fs.writeFileSync(fileName, array);
  await mtp.close();
});
