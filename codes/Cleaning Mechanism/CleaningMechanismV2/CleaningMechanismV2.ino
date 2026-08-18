/**
 * Cleaning Mechanism Control Code - Version 2 (Handshake Enabled)
 * Target Hardware: Arduino Uno + CNC Shield V3 + A4988 Stepper Drivers
 * 
 * Slots Used on CNC Shield:
 * - X slot for X-axis stepper motor
 * - Y slot for Y-axis stepper motor
 * 
 * Signal Links with ESP8266:
 * - TRIGGER_PIN (Analog A2 - CNC Resume Pin) <-- Connected to ESP8266 D6 (glassCleanerPin)
 * - FEEDBACK_PIN (Analog A3 - CNC CoolEn Pin) --> Connected to ESP8266 D7 (limitSwitchPin)
 * - Shared GND link is mandatory.
 * 
 * Logic Flow:
 * 1. Steppers are kept disabled (EN high) when idle to prevent overheating.
 * 2. Arduino waits for a LOW pulse on TRIGGER_PIN (sent by ESP8266).
 * 3. Once triggered, it enables the stepper drivers.
 * 4. Y-axis does 600 steps forward and backward.
 * 5. X-axis steps 100 steps.
 * 6. Repeat Y and X loops until X reaches 800 total steps.
 * 7. X-axis returns 800 steps back to starting home position.
 * 8. Arduino pulls FEEDBACK_PIN LOW for 1 second to signal completion.
 * 9. ESP8266 detects this, resets Firebase database status to false, and Arduino returns to idle.
 */

// CNC Shield V3 pin mappings for Arduino Uno
#define EN_PIN        8   // Stepper Enable Pin (Active LOW)
#define X_STEP_PIN    2   // X-axis step pin
#define X_DIR_PIN     5   // X-axis direction pin
#define Y_STEP_PIN    3   // Y-axis step pin
#define Y_DIR_PIN     6   // Y-axis direction pin

// Handshake pins on CNC Shield V3
#define TRIGGER_PIN   A2  // "Resume" Pin header. Receives trigger from ESP8266 D6
#define FEEDBACK_PIN  A3  // "CoolEn" Pin header. Sends complete signal to ESP8266 D7

// Movement configuration
const int Y_STROKE_STEPS    = 600;  // Steps for Y-axis travel out and back
const int X_TOTAL_STEPS     = 800;  // Total travel steps for X-axis climbing
const int X_INCREMENT_STEPS  = 100; // Steps X-axis moves after each Y cycle

// Speed settings (delay in microseconds between steps)
// Increase to go slower, decrease to go faster.
const int Y_SPEED_DELAY     = 2000; 
const int X_SPEED_DELAY     = 2000;

// Direction logic constants (swap if motors spin the wrong direction)
const bool DIR_FORWARD      = true;
const bool DIR_BACKWARD     = false;

void setup() {
  Serial.begin(115200);
  Serial.println("Initializing CNC V3 Cleaning Mechanism V2...");

  // Configure stepper control pins
  pinMode(EN_PIN, OUTPUT);
  pinMode(X_STEP_PIN, OUTPUT);
  pinMode(X_DIR_PIN, OUTPUT);
  pinMode(Y_STEP_PIN, OUTPUT);
  pinMode(Y_DIR_PIN, OUTPUT);

  // Keep stepper drivers DISABLED at start to save power and prevent motor heating
  digitalWrite(EN_PIN, HIGH); 

  // Configure Handshake Pins
  pinMode(TRIGGER_PIN, INPUT_PULLUP); // Normal state is HIGH due to internal pull-up
  pinMode(FEEDBACK_PIN, INPUT);        // High-impedance mode when idle (does not pull line low)

  Serial.println("System Ready. Waiting for ESP8266 start signal...");
}

void loop() {
  // Wait for the ESP8266 to pull the TRIGGER_PIN LOW
  if (digitalRead(TRIGGER_PIN) == LOW) {
    Serial.println("=== Start Signal Received! ===");
    delay(50); // Debounce delay

    // 1. Enable stepper drivers
    digitalWrite(EN_PIN, LOW); 
    delay(100);

    int currentXPosition = 0;

    // 2. Perform cleaning sweep logic
    while (currentXPosition < X_TOTAL_STEPS) {
      Serial.print("Progress: ");
      Serial.print(currentXPosition);
      Serial.print(" / ");
      Serial.println(X_TOTAL_STEPS);

      // Y-axis sweeps forward
      Serial.println("Y-Axis: Sweeping forward...");
      moveStepper(Y_STEP_PIN, Y_DIR_PIN, DIR_FORWARD, Y_STROKE_STEPS, Y_SPEED_DELAY);
      delay(200);

      // Y-axis sweeps backward
      Serial.println("Y-Axis: Sweeping backward...");
      moveStepper(Y_STEP_PIN, Y_DIR_PIN, DIR_BACKWARD, Y_STROKE_STEPS, Y_SPEED_DELAY);
      delay(500);

      // X-axis steps forward a little
      Serial.println("X-Axis: Advancing position...");
      moveStepper(X_STEP_PIN, X_DIR_PIN, DIR_FORWARD, X_INCREMENT_STEPS, X_SPEED_DELAY);
      currentXPosition += X_INCREMENT_STEPS;
      
      delay(500); 
    }

    // 3. Return X-axis back to the starting point
    Serial.println("Cleaning sweeps finished. X-Axis returning to home...");
    moveStepper(X_STEP_PIN, X_DIR_PIN, DIR_BACKWARD, X_TOTAL_STEPS, X_SPEED_DELAY);
    delay(500);

    // 4. Send "Done" Feedback signal to ESP8266
    Serial.println("Sending completion signal to ESP8266...");
    pinMode(FEEDBACK_PIN, OUTPUT);
    digitalWrite(FEEDBACK_PIN, LOW); // Pull Pin D7 of ESP8266 LOW
    delay(1000);                      // Hold LOW for 1 second to ensure detection
    
    // Release the feedback pin (return to high-impedance input mode)
    pinMode(FEEDBACK_PIN, INPUT);

    // 5. Disable stepper drivers to cool down
    digitalWrite(EN_PIN, HIGH);
    Serial.println("=== Cleaning completed. Steppers disabled. Idle. ===");
  }
}

/**
 * Utility function to rotate a stepper motor
 */
void moveStepper(int stepPin, int dirPin, bool dir, int steps, int speedDelayUs) {
  digitalWrite(dirPin, dir ? HIGH : LOW);
  for (int i = 0; i < steps; i++) {
    digitalWrite(stepPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(stepPin, LOW);
    delayMicroseconds(speedDelayUs);
  }
}
