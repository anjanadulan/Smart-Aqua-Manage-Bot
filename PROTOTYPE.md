# Connected Prototype Plan

## Approved baseline

- Main controller: ESP32 DevKit V1.
- Camera: ESP32-CAM with PSRAM, using Espressif's CameraWebServer example for local MJPEG.
- Spare boards: one NodeMCU and three Arduino Uno boards, reserved for later subsystem isolation.
- Water level response: force the filtration relay off and publish a critical notification event.
- Water cleanliness: use an analog turbidity sensor and a calibrated clarity percentage. Dirty water raises an alert while filtration remains available.
- Feeder: automatic every six hours; scheduled feeds check the IR leftover-food sensor; manual feed bypasses the IR check.
- UV: auto mode runs from 18:00 to 06:00, a 12-hour night cycle.
- Dashboard: served locally by the ESP32 from LittleFS, with WebSocket telemetry on port 82.

## System topology

```text
Browser or phone
  | HTTP 80 + WebSocket 82
  v
ESP32 DevKit controller
  |-- low-water sensor
  |-- turbidity sensor
  |-- IR food sensor
  |-- filtration relay
  |-- UV relay
  `-- feeder servo

Browser or phone
  | MJPEG on local network or private routed network
  v
ESP32-CAM
```

The ESP32 controller owns all automatic behavior. Closing the browser or losing internet access does not stop feeding, low-water protection, sensor polling, or relay control while the controller remains powered.

## Camera access from anywhere

### Prototype recommendation: Tailscale subnet router

Run Tailscale on an always-on Raspberry Pi, mini PC, home server, or supported router on the aquarium LAN. Advertise the aquarium subnet and install Tailscale on each authorized phone or computer. The user then opens the ESP32 dashboard and ESP32-CAM stream through their normal local IP addresses.

Why this is the first choice:

- No inbound router port forwarding.
- Access is private to authorized Tailscale devices.
- Tailscale attempts a direct peer-to-peer UDP connection, which normally has the best latency and throughput.
- Relay paths remain available when direct NAT traversal fails, although relay use adds latency.
- The ESP32 and ESP32-CAM do not need to run a VPN client themselves.

Use the dashboard's **ESP32-CAM MJPEG** camera mode with a URL such as `http://192.168.1.101:81/stream`.

### Later public-browser option: MediaMTX WebRTC gateway

If viewers must connect from an ordinary browser without installing Tailscale, run MediaMTX on an always-on gateway and expose it through authenticated HTTPS. Configure the dashboard's **MediaMTX WebRTC** mode with the MediaMTX browser playback URL. This adds infrastructure but provides a browser-native low-latency path and avoids embedding a raw ESP32-CAM service on the public internet.

Do not expose the ESP32-CAM directly with router port forwarding.

## What schedule persistence means

Schedule persistence answers this question: after a power failure, does the controller remember when the next feeding and UV transition should happen, or does every timer start again from zero?

The current prototype behaves as follows:

- Feeder: after a reboot without a valid clock, the next feed is scheduled six hours from startup. It does not try to "catch up" missed feeds because an immediate catch-up could overfeed fish.
- UV auto schedule: requires the correct wall-clock time to know whether it is currently night. The browser sends the current time whenever it connects. Until time is valid, UV auto mode remains off.
- UV mode selection is stored in ESP32 Preferences and survives restart.

For a true cold start with no internet, no browser, and correct night-time scheduling after complete power loss, add a battery-backed **DS3231 real-time clock module**. The ESP32's software clock cannot know the real time after total power loss by itself.

## Electrical and mechanical gates

- Verify whether each relay input is active-low before connecting mains-powered equipment.
- Power the servo and relays from an appropriate regulated supply; join logic grounds.
- Keep every ESP32 input below 3.3 V. Add a divider or interface circuit if the turbidity board can output more than 3.3 V.
- Use an IP-rated enclosure, GFCI/RCD protection, strain relief, fusing, and physical separation between mains and logic wiring.
- Keep the CNC cleaner disabled until both axes have limit switches, tested travel limits, and an emergency stop.
