const Mtp = require('./mtp.js');

const mtp = new Mtp(0x0e8d, 0x201d);

mtp.on('error', err => console.log('Error', err));
mtp.on('ready', async () => {
  await mtp.openSession();
  const handles = await mtp.getObjectHandles();
  const objectHandle = Math.max(...handles);
  const fileName = await mtp.getFileName(objectHandle);
  await mtp.getFile(objectHandle, fileName);
  await mtp.closeAsync();
});
