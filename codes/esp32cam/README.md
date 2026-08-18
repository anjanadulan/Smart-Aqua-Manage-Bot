# Aquify ESP32-CAM

Standalone firmware for an AI Thinker ESP32-CAM.

## Before uploading

1. Put the Wi-Fi and Firebase device credentials in `secrets.h`. The Firebase
   values can match the device account used by the main controller.
2. Select **AI Thinker ESP32-CAM** in Arduino IDE.
3. Enable PSRAM if the board menu exposes that option.
4. Connect GPIO 0 to GND while uploading, then disconnect GPIO 0 and reset the
   board.
5. Use a stable 5 V supply. Camera initialization and Wi-Fi can fail when an
   FTDI adapter cannot supply enough current.

Open Serial Monitor at 115200 baud to see the assigned IP address.

## Endpoints

- `http://<camera-ip>/` — camera page
- `http://<camera-ip>/capture` — current JPEG frame
- `http://<camera-ip>:81/stream` — MJPEG stream
- `http://<camera-ip>/health` — health and IP information

The camera feed is available only to devices that can reach the ESP32-CAM on
the local network.

## Cloud snapshots

The web app refreshes `devices/aqua-main/camera/heartbeat` after the user
starts the preview and while its camera panel is visible. The ESP32-CAM then:

1. Captures a QVGA JPEG every second.
2. Overwrites `devices/aqua-main/camera/latest/blob` in Firebase Realtime
   Database.
3. Updates `devices/aqua-main/camera/latest/updatedAt`.
4. Stops uploading when the heartbeat is more than 30 seconds old.

The Firebase Arduino client stores the JPEG as a Base64 blob. This provides
remote snapshots without Firebase Storage, a paid plan, or continuous video
streaming. Stopping the preview writes a zero heartbeat, immediately
unsubscribes the web app from the image node, and pauses image data transfer.

The web app also controls the AI Thinker board's white flashlight on GPIO 4
through `devices/aqua-main/camera/flashlight`. This control works independently
of the snapshot preview.
