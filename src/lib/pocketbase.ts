import PocketBase from 'pocketbase';

const PB_URL = import.meta.env.DEV
  ? 'http://localhost:8097'
  : 'https://safe-vietnam.lvtcenter.it.com';

const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

export default pb;
