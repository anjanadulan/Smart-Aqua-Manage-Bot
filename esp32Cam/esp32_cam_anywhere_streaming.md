# ESP32-CAM Internet Streaming Guide (Anywhere, Anytime)

By default, your ESP32-CAM serves an HTTP MJPEG stream (port 81) on your **local area network (LAN)** (e.g., `http://192.168.1.101:81`). To view this stream from outside your home network (via cellular data or external Wi-Fi), you must bridge the stream to the **wide area network (WAN)**.

This guide details the **four main architectures** to achieve this, followed by a dedicated section on achieving **480p/720p HD quality with ultra-low latency**.

---

## 📊 Comparison Matrix

| Method | Security | Latency | Difficulty | Extra Hardware | Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Cloud Relay (WebSockets)** 🌟 | 🟢 High | 🟡 Medium (~200-500ms) | 🟡 Medium | None | Free |
| **2. Tunneling (Ngrok / Tailscale)** | 🟢 High | 🟢 Low (~100-200ms) | 🟢 Easy | Always-on PC/Pi | Free |
| **3. Telegram Bot (On-Demand)** | 🟢 High | 🔴 N/A (Photos/Clips) | 🟢 Easy | None | Free |
| **4. Port Forwarding & DDNS** | 🔴 Low (Dangerous) | 🟢 Low (~50-100ms) | 🔴 Hard | None (Router config) | Free |

---

## ⚡ Achieving 480p/720p Quality with Ultra-Low Latency

If you want **high quality (480p/720p)** and **sub-second latency (<200ms)**, you must design around the ESP32's hardware limitations and network path bottlenecks.

### 1. Hardware Constraints of ESP32-CAM & OV2640
* **Resolution Settings:** 
  * **VGA ($640 \times 480$ / "480p equivalent"):** The sweet spot. The ESP32-CAM can compress and stream VGA at 20–25 FPS with ease.
  * **SVGA ($800 \times 600$):** High clarity, runs stably at 15–20 FPS.
  * **HD / SXGA ($1280 \times 1024$ or $1280 \times 720$):** Supported, but frame rate drops to **5–10 FPS** because the ESP32 CPU must compress large images, which limits throughput.
* **PSRAM Dependency:** Resolutions above CIF ($352 \times 288$) require external PSRAM to store the frame buffers. Ensure your ESP32-CAM module has PSRAM enabled in your Arduino IDE settings (`Tools > Board > ESP32 Wrover Module` or check if `psramInit()` passes).

---

### 🏆 The Best Solution: Direct P2P Tunneling (Tailscale or Husarnet)

To get the absolute lowest latency, you must establish a **direct peer-to-peer (P2P) connection** between your viewing device (phone/laptop) and the ESP32-CAM. This bypasses the cloud completely, sending packets directly over UDP with zero middle-man buffering.

```
+--------------------+               (Direct P2P Link)               +-------------------+
|     ESP32-CAM      | <===========================================> |  Web Dashboard    |
| (192.168.1.101/AP) |       Tailscale/Husarnet Encrypted UDP        | (Viewed anywhere) |
+--------------------+                                               +-------------------+
```

#### Approach A: Tailscale Subnet Router (Easiest & Most Robust)
If you have an always-on Raspberry Pi, home server, or PC on your home network:
1. Install **Tailscale** on that device.
2. Enable it as a **Subnet Router** to expose your local home network range (e.g., `192.168.1.0/24`):
   ```bash
   sudo tailscale up --advertise-routes=192.168.1.0/24
   ```
3. Approve the routes in your Tailscale Admin Console.
4. Install Tailscale on your phone or laptop.
5. **Result:** You can now open your web dashboard from anywhere in the world and access the camera directly using its local IP (`http://192.168.1.101:81/stream`) with near-zero added latency.

#### Approach B: Husarnet (P2P directly on ESP32-CAM)
Husarnet can run directly on the ESP32 CPU without requiring any local gateway PC:
1. Install the `Husarnet` library in your Arduino IDE.
2. Flash your ESP32-CAM with the Husarnet Web Server example.
3. Access the camera stream anywhere using its Husarnet IPv6 URL.

---

### 🥈 Alternative Solution: RTSP to WebRTC Gateway (Pro Setup)

Since the ESP32 does not support hardware H.264 compression, streaming MJPEG directly over WAN consumes a lot of bandwidth. If you want high-FPS 720p, you should offload the streaming protocol to a local gateway.

```
+---------------+                [LOCAL LAN]                +------------------------+             +-------------------+
|   ESP32-CAM   | --[RTSP/MJPEG]--> (Low Overhead) --------> |   Raspberry Pi / PC    | -[WebRTC]-> |   Web Dashboard   |
| (VGA / SVGA)  |                                            | (Mediamtx / WebRTC GW) |   (UDP/SSL) | (Viewed anywhere) |
+---------------+                                            +------------------------+             +-------------------+
```

1. **Firmware:** Flash the ESP32-CAM with an RTSP server firmware (like `Micro-RTSP` or `ESP32-CAM-RTSP`). This has much lower overhead than HTTP MJPEG.
2. **Gateway:** Run **MediaMTX** (a zero-dependency media server) or **go2rtc** on a local Raspberry Pi or PC.
3. **Bridge:** MediaMTX pulls the RTSP stream from the ESP32-CAM and transcodes/re-packages it into **WebRTC (Real-Time Communication)**.
4. **Dashboard:** The web dashboard connects to the MediaMTX WebRTC endpoint. WebRTC runs over UDP and matches the frame rate, keeping lag below **100 milliseconds** even at 720p.

---

## 💻 Integrating the Stream into your Web App Dashboard

Depending on the streaming method you select, you need to modify the files inside your project's `3D/` folder:

### Option A: If using MJPEG (Ngrok, Tailscale, Cloud Relay)

This is the easiest setup since modern web browsers natively support MJPEG via the standard HTML `<img>` tag.

1. Open [index.html](file:///d:/NIBM%20PRojects/Robotics/3D/index.html) and locate the following placeholder block:
   ```html
   <!-- ESP32-CAM Feed -->
   <div class="preview-container">
       <div class="preview-overlay">
           <span class="live-dot"></span>
           <span>ESP32-CAM STREAM</span>
       </div>
       <img id="camera-feed" class="preview-feed" src="https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=640&q=80" alt="ESP32-CAM Stream">
   </div>
   ```

2. Replace the `src` attribute of the `<img>` tag with your public WAN endpoint:
   * **If using Ngrok:**
     ```html
     src="https://your-subdomain.ngrok-free.app/stream"
     ```
   * **If using Tailscale:**
     ```html
     src="http://192.168.1.101:81/stream"  <!-- Keep the local IP; Tailscale routes it remotely -->
     ```
   * **If using Cloud Relay (Node.js):**
     ```html
     src="https://your-relay-server.onrender.com/stream"
     ```

---

### Option B: If using WebRTC (Ultra-low latency, MediaMTX/go2rtc)

Since WebRTC does not stream via simple HTTP multipart JPEG, it requires a HTML5 `<video>` element and a small signaling connection in Javascript.

1. Open [index.html](file:///d:/NIBM%20PRojects/Robotics/3D/index.html) and replace the `<img>` tag with a `<video>` tag:
   ```html
   <!-- Replace the <img> tag in index.html -->
   <video id="camera-feed" class="preview-feed" autoplay playsinline muted></video>
   ```

2. Open [app.js](file:///d:/NIBM%20PRojects/Robotics/3D/app.js) and initialize the WebRTC peer connection at the end of the `DOMContentLoaded` event:
   ```javascript
   // Add this script block to handle WebRTC handshake (e.g. MediaMTX / go2rtc WHEP API)
   const videoElement = document.getElementById('camera-feed');
   const webrtcUrl = 'http://your-gateway-ip:8889/mystream/whep'; // MediaMTX WHEP endpoint

   async function startWebRTCStream() {
       const pc = new RTCPeerConnection({
           iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
       });

       pc.ontrack = (event) => {
           if (videoElement.srcObject !== event.streams[0]) {
               videoElement.srcObject = event.streams[0];
           }
       };

       // Add receive-only video transceivers
       pc.addTransceiver('video', { direction: 'recvonly' });

       // Create local Offer
       const offer = await pc.createOffer();
       await pc.setLocalDescription(offer);

       // Post offer to WHEP signaling service
       const response = await fetch(webrtcUrl, {
           method: 'POST',
           headers: { 'Content-Type': 'application/sdp' },
           body: pc.localDescription.sdp
       });

       if (response.ok) {
           const answerSdp = await response.text();
           await pc.setRemoteDescription(new RTCSessionDescription({
               type: 'answer',
               sdp: answerSdp
           }));
       } else {
           console.error("WebRTC Handshake failed");
       }
   }

   // Run stream startup
   startWebRTCStream().catch(console.error);
   ```

---

## 🛠️ Detailed Implementation Guide for Method 1: Cloud WebSocket/HTTP Relay

*(Previous setup code kept below for reference...)*
