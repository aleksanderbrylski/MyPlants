/**
 * Firebase project configuration.
 * Copy this file to firebase.config.ts and fill in your project values.
 * Get them from: Firebase Console → Project settings → General → Your apps.
 *
 * For Google Sign-In: use the "Web client ID" from
 * Firebase Console → Authentication → Sign-in method → Google.
 *
 * Do not commit firebase.config.ts (it is in .gitignore).
 */
export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
  /** Required for Google Sign-In. Web client ID from Auth → Sign-in method → Google. */
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
};
