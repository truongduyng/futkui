import { init } from '@instantdb/react-native';
import schema from '../../instant.schema';

// Validate the InstantDB app ID to prevent production issues
const appId = process.env.EXPO_PUBLIC_INSTANT_APP_ID;

if (!appId || appId === 'default-app-id') {
  throw new Error(
    'InstantDB app ID is missing or using default value. ' +
    'Please ensure EXPO_PUBLIC_INSTANT_APP_ID is set in your environment variables.'
  );
}

export const instantClient = init({
  appId,
  schema,
});