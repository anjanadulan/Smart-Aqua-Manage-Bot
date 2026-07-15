#pragma once

// Copy this file to secrets.h and replace the values for your network.
// secrets.h is ignored by Git.
constexpr char WIFI_SSID[] = "YOUR_WIFI_NAME";
constexpr char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";

// The ESP32 always creates this fallback access point for local setup.
constexpr char AP_SSID[] = "Aqua-Sentinel";
constexpr char AP_PASSWORD[] = "change-this-password";
