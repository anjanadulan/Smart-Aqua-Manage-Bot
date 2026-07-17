Exit code: 0
Wall time: 0.5 seconds
Output:
#pragma once

// Copy this file to secrets.h and replace the values for your network.
// secrets.h is ignored by Git.
constexpr char WIFI_SSID[] = "YOUR_WIFI_NAME";
constexpr char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";

// The ESP32 always creates this fallback access point for local setup.
constexpr char AP_SSID[] = "Aqua-Sentinel";
constexpr char AP_PASSWORD[] = "change-this-password";

// Firebase device account. Create a dedicated Email/Password Firebase user
// for the ESP32; never use the web operator account in firmware.
constexpr char FIREBASE_API_KEY[] = "YOUR_FIREBASE_WEB_API_KEY";
constexpr char FIREBASE_DEVICE_EMAIL[] = "YOUR_DEVICE_FIREBASE_EMAIL";
constexpr char FIREBASE_DEVICE_PASSWORD[] = "YOUR_DEVICE_FIREBASE_PASSWORD";
constexpr char FIREBASE_DATABASE_URL[] = "https://aqua-bot-dcbe0-default-rtdb.asia-southeast1.firebasedatabase.app";


