# MyPlants

A mobile app for tracking and managing your houseplants. MyPlants helps you stay on top of watering, fertilization, and misting schedules with reminders and a clear overview of upcoming care tasks.

## Features

- Track multiple plants with photos, names, and care schedules
- Configure watering, fertilization, and misting intervals per plant
- Fertilization can be set on a fixed interval or tied to watering cycles
- Dashboard showing upcoming tasks with relative due dates (today, overdue, in N days)
- Push notifications with a daily background check for due tasks
- Full garden view with per-plant detail and edit screens
- Authentication via email/password or Google Sign-In
- Data synced in real-time via Firebase Firestore
- Plant photos stored in Firebase Storage

## Tech Stack

- [Expo](https://expo.dev) (SDK 54) with [Expo Router](https://expo.github.io/router/) for file-based navigation
- React Native 0.81 + React 19
- Firebase (Auth, Firestore, Storage)
- TypeScript
- `expo-notifications` + `expo-background-fetch` for scheduled reminders
- `expo-image-picker` for plant photos
- `expo-auth-session` for Google OAuth

## Getting Started

### Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) or `npx expo`
- A Firebase project with Auth, Firestore, and Storage enabled

### 1. Clone and install

```bash
git clone <repo-url>
cd myplants
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root with your Firebase credentials:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID=your_web_client_id
EXPO_PUBLIC_FIREBASE_ANDROID_CLIENT_ID=your_android_client_id
```

You can find these values in your Firebase project settings.

### 3. Run the app

```bash
# Start Expo dev server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run in browser
npm run web
```

> Push notifications require a development build (`expo-dev-client`). They won't work in Expo Go.

## Firebase Setup

In your Firebase console:

1. Enable **Email/Password** and **Google** sign-in methods under Authentication
2. Create a **Firestore** database — plant data is stored under `users/{uid}/plants`
3. Enable **Firebase Storage** for plant images
4. Add your SHA-1 fingerprint to the Android app in Firebase if using Google Sign-In on Android
