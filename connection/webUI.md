# Web UI Deployment & Configuration Requirements

This document details exactly what accounts, credentials, configuration settings, and steps are required to build, host, and run the flat 2D Web Dashboard using **Vercel** and **Google Firebase Realtime Database**.

---

## 📋 1. Required Accounts & Platforms

To deploy and run the dashboard globally for free, you need to set up three accounts:
1. **GitHub Account:** To host your project repository (`Smart-Aqua-Manage-Bot`). [Sign up free](https://github.com).
2. **Vercel Account:** To host and deploy the web dashboard files. [Sign up free](https://vercel.com) (Log in using your GitHub account for automatic integration).
3. **Google Firebase Account:** To act as the real-time database bridge between the web dashboard and the ESP32. [Sign up free](https://firebase.google.com).

---

## 🧪 2. Firebase Database Setup & Credentials

You must create and configure a Realtime Database project in Google Firebase to act as the communication hub.

### A. Setup Steps
1. Go to the [Firebase Console](https://console.firebase.google.com).
2. Click **Add Project** and name it (e.g., `smart-aqua-sentinel`).
3. (Optional) Disable Google Analytics to speed up setup. Click **Create Project**.
4. In the left sidebar, click **Build** ➔ **Realtime Database**.
5. Click **Create Database**.
6. Select a database location (choose the region closest to you, e.g., United States or Belgium).
7. Start in **Test Mode** (this opens read/write access for initial testing).

### B. Database Security Rules
Once setup is complete, navigate to the **Rules** tab and paste the following rules to allow the Vercel dashboard and ESP32 to communicate:

```json
{
  "rules": {
    ".read": "true",
    ".write": "true"
  }
}
```
> [!WARNING]
> *Test Mode rules expire after 30 days. For permanent setups, secure database rules using secret token auth or private keys should be defined.*

### C. Required Credentials
To link the web dashboard to this database, copy the **Web Config Keys** from **Project Settings** (the gear icon on the left sidebar):
* **`apiKey`** (Firebase Web API Key)
* **`databaseURL`** (The URL of your Realtime Database, e.g., `https://your-project-default-rtdb.firebaseio.com/`)
* **`projectId`** (Your unique project ID string)
* **`appId`** (The unique ID of the web application registration)

---

## ⚡ 3. Vercel Hosting Deployment Steps

Vercel will host your static files (HTML, CSS, JS) and deploy them to a public HTTPS URL automatically.

### Deployment Process
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** ➔ **Project**.
3. Select your GitHub repository (`Smart-Aqua-Manage-Bot`) and click **Import**.
4. In the Project Configuration settings:
   * **Framework Preset:** Select `Other` or `None` (it is a plain HTML/JS website).
   * **Root Directory:** Edit this and select the **`web/`** folder. *Do not deploy the root of the repo; Vercel only needs the files inside `web/`.*
5. **Environment Variables:** Click to expand and add your Firebase credentials so the JavaScript code can read them:
   * Key: `NEXT_PUBLIC_FIREBASE_API_KEY` ➔ Value: `(Your Firebase API Key)`
   * Key: `NEXT_PUBLIC_FIREBASE_DB_URL` ➔ Value: `(Your Database URL)`
6. Click **Deploy**.
7. Vercel will build your project in seconds and give you a public URL (e.g., `https://smart-aqua-sentinel.vercel.app`).

---

## 🔌 4. Connecting the ESP32 Controller

For the hardware to sync with your new cloud database, you must flash the ESP32 firmware with the matching Firebase credentials.

### Required variables inside `firmware/esp32-controller/include/secrets.h`:
```cpp
#define WIFI_SSID "Your_Home_WiFi_Name"
#define WIFI_PASSWORD "Your_WiFi_Password"

#define FIREBASE_HOST "your-project-default-rtdb.firebaseio.com" // without https://
#define FIREBASE_AUTH "Your_Firebase_Database_Secret_Token"
```

Once both the **Vercel App** and the **ESP32** are configured with the same Firebase credentials, they will synchronize data in real-time.
