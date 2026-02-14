# Firebase setup for MyPlants

## 1. Create and connect your Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/) and select (or create) your project.
2. Add a **Web app** (</> icon). Copy the `firebaseConfig` object.
3. In this repo, copy `lib/firebase.config.example.ts` to `lib/firebase.config.ts` and paste your config values.  
   **Do not commit** `lib/firebase.config.ts` (it is in `.gitignore`).

## 2. Enable Authentication

1. In Firebase Console → **Build** → **Authentication** → **Get started**.
2. Open the **Sign-in method** tab.
3. Enable **Email/Password** (and optionally **Email link** if you want).
4. **Google**: Enable the **Google** provider. Copy the **Web client ID** (and Web client secret if you use a backend).  
   In `lib/firebase.config.ts` set `webClientId` to that Web client ID (e.g. `"123...apps.googleusercontent.com"`).

### Google Sign-In: Web client ID and redirect URIs

**401 invalid_client / "The OAuth client was not found"** means the **Web client ID** or **redirect URI** is wrong. Do this:

1. **Get the correct Web client ID**
   - Firebase Console → **Authentication** → **Sign-in method** → **Google** → turn on **Enable** and save.
   - In the same Google provider card you’ll see **Web SDK configuration** with **Web client ID** and **Web client secret**.
   - Copy the **Web client ID** (it ends with `.apps.googleusercontent.com`).
   - Put it in `lib/firebase.config.ts` as `webClientId: "PASTE_HERE"`.
   - You must use this **Web** client ID. Do **not** use an Android or iOS client ID.

2. **Add redirect URIs in Google Cloud**
   - Open [Google Cloud Console](https://console.cloud.google.com/) and select the **same project** as your Firebase app.
   - Go to **APIs & Services** → **Credentials**.
   - Under **OAuth 2.0 Client IDs**, open the **Web client** (the one whose Client ID matches the Web client ID from Firebase).
   - Under **Authorized redirect URIs** click **Add URI** and add **every** URI your app can use:
     - **Native / dev build**: `myapp://redirect`
     - **Web (local)**: `https://localhost:19006/redirect` or `http://localhost:8081/redirect` (try both if unsure).
     - **Web (deployed)**: `https://yourdomain.com/redirect`
   - Save.

3. **Check the client type**
   - The credential you edit must be of type **Web application**. If you only have “Android” or “iOS” clients, create a new **Web application** OAuth 2.0 client in Credentials, then use that client’s ID as `webClientId` and add the redirect URIs above to that client.

## 3. Firebase Storage (for plant images)

1. **Build** → **Storage** → **Get started** (create a bucket if needed).
2. For development you can use test-mode rules; for production, restrict access per user. Example rules:

```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 4. Firestore database

1. **Build** → **Firestore Database** → **Create database** (start in **test mode** for development, then lock down with rules).
2. Plant data is stored per user at: `users/{userId}/plants`.  
   Each plant has: `name`, `watering`, `sunlight`, `fertilization`, `imageUrl`, `createdAt`, `updatedAt`.

### Optional: Firestore security rules

To restrict access so users can only read/write their own plants:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 5. Run the app

```bash
npm start
```

Log in or sign up with **email/password** or **Continue with Google**; you’ll be redirected to the home screen. Use **Sign out** on the home screen to log out.

## Firestore composite index

If you get an error about a missing index when loading plants, use the link in the error to create it in the Firebase Console, or add:

- Collection: `users/{userId}/plants`
- Fields: `createdAt` (Descending)

## Using Firestore and Storage in the app

- **Auth**: `useAuth()` from `@/contexts/AuthContext` gives you `user`, `signIn`, `signUp`, `signInWithGoogleIdToken`, `signOut`.
- **Plants**: Use helpers from `@/lib/firestore.ts`: `getPlants(uid)`, `subscribePlants(uid, callback)`, `addPlant`, `updatePlant`, `deletePlant`, `uploadPlantImage`.  
  Plant images are stored in Firebase Storage at `users/{uid}/plants/{plantId}/image`.
