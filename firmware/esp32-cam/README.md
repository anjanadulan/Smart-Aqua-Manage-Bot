# ESP32-CAM Prototype Setup

Use Espressif's maintained `CameraWebServer` example from the Arduino-ESP32 core for the first camera build.

## Flash the camera

1. Install the current stable Arduino-ESP32 core in Arduino IDE.
2. Open `File > Examples > ESP32 > Camera > CameraWebServer`.
3. Select the camera model matching your physical board. AI Thinker modules normally use `CAMERA_MODEL_AI_THINKER`; verify the board marking first.
4. Enter the same local Wi-Fi credentials used by the controller.
5. Select an ESP32 board configuration with PSRAM enabled.
6. Flash the module and open the serial monitor at 115200 baud.
7. Open the printed camera address and verify the stream before adding it to the Aqua Sentinel settings.

For the common CameraWebServer layout, the control page is on port 80 and the MJPEG stream is on the next server port. Confirm the exact stream URL printed or used by your installed example rather than assuming an address.

## Prototype quality target

- Start at VGA, 640 by 480, for the best balance of detail, frame rate, and Wi-Fi load.
- Disable Wi-Fi sleep for lower latency.
- Use two frame buffers only when PSRAM is detected.
- Keep the ESP32-CAM on a stable 5 V supply. Camera brownouts commonly look like network or stream failures.

## Anywhere access

Do not port-forward the ESP32-CAM. Route the aquarium LAN through the Tailscale subnet router described in `PROTOTYPE.md`. In the dashboard, choose **ESP32-CAM MJPEG** and enter the routed local stream URL.

If you later add an always-on MediaMTX gateway, choose **MediaMTX WebRTC** in the dashboard and enter its browser playback URL.

## Official references

- Espressif Arduino-ESP32 CameraWebServer example: <https://github.com/espressif/arduino-esp32/tree/master/libraries/ESP32/examples/Camera/CameraWebServer>
- Espressif camera driver: <https://github.com/espressif/esp32-camera>
