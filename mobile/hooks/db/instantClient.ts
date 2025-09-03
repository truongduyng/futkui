import { init } from '@instantdb/react-native';
import schema from '../../instant.schema';

export const instantClient = init({
  appId: process.env.EXPO_PUBLIC_INSTANT_APP_ID || 'default-app-id',
  schema,
});