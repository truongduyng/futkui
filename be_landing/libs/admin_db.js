import { init } from '@instantdb/admin'

// Initialize InstantDB admin - you'll need to set these environment variables
const db = init({
  appId: process.env.INSTANT_APP_ID,
  adminToken: process.env.INSTANT_ADMIN_TOKEN,
});

export default db;
