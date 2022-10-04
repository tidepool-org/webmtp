import Mtp from './mtp.js';
import fs from 'fs';

const mtp = new Mtp(0x0e8d, 0x201d);

mtp.addEventListener('error', err => console.log('Error', err));

mtp.addEventListener('ready', async () => {
  await mtp.openSession();
  const handles = await mtp.getObjectHandles();

  handles.sort((a, b) => b - a);
  console.log('Handles:', handles);

  let fileName;
  let objectHandle;
  for (let i = 0; i < handles.length; i++) {
    objectHandle = handles[i];
    fileName = await mtp.getFileName(objectHandle);
    if (fileName.endsWith('.ibf')) {
      break;
    }
  }

  const array = await mtp.getFile(objectHandle, fileName);
  fs.writeFileSync(fileName, array);
  await mtp.close();
});
