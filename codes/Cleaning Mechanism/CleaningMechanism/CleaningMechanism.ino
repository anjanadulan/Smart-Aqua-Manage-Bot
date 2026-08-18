/**
 * Cleaning Mechanism Control Code
 * Target Hardware: Arduino Uno + CNC Shield V3 + A4988 Stepper Drivers
 * 
 * Slots Used on CNC Shield:
 * - X slot for X-axis stepper motor
 * - Y slot for Y-axis stepper motor
 * 
 * Cleaning Routine:
 * 1. Y motor moves forward 600 steps slowly, then backward 600 steps slowly (1 round).
 * 2. X motor moves forward by 100 steps.
 * 3. This cycle repeats until X has moved a total of 800 steps (8 Y-rounds).
 * 4. X motor returns to its starting position (800 steps backward).
 * 5. Pauses before the next cleaning cycle.
 */

// CNC Shield V3 pin mappings for Arduino Uno
#define EN_PIN      8   // Stepper Enable Pin (Active LOW)
#define X_STEP_PIN  2   // X-axis step pin
#define X_DIR_PIN   5   // X-axis direction pin
#define Y_STEP_PIN  3   // Y-axis step pin
#define Y_DIR_PIN   6   // Y-axis direction pin

// Movement configuration
const int Y_STROKE_STEPS   = 600;  // Steps for Y-axis travel out and back
const int X_TOTAL_STEPS    = 800;  // Total travel steps for X-axis climbing
const int X_INCREMENT_STEPS = 100; // Steps X-axis moves after each Y cycle

// Speed settings (delay in microseconds between steps)
// Increase to go slower, decrease to go faster. (1000 - 3000 is good for A4988)
const int Y_SPEED_DELAY    = 2000; 
const int X_SPEED_DELAY    = 2000;

// Direction logic constants (swap true/false if motors spin the wrong direction)
const bool DIR_FORWARD     = true;
const bool DIR_BACKWARD    = false;

void setup() {
  Serial.begin(115200);
  Serial.println("Initializing CNC V3 Cleaning Mechanism...");

  // Configure control pins
  pinMode(EN_PIN, OUTPUT);
  pinMode(X_STEP_PIN, OUTPUT);
  pinMode(X_DIR_PIN, OUTPUT);
  pinMode(Y_STEP_PIN, OUTPUT);
  pinMode(Y_DIR_PIN, OUTPUT);

  // Enable steppers (Active LOW)
  digitalWrite(EN_PIN, LOW); 
  Serial.println("Stepper drivers enabled.");
}

void loop() {
  Serial.println("=== Starting Cleaning Cycle ===");

  int currentXPosition = 0;

  // Keep repeating Y cycles and stepping X forward until X reaches total steps (800)
  while (currentXPosition < X_TOTAL_STEPS) {
    Serial.print("X Position: ");
    Serial.print(currentXPosition);
    Serial.print(" / ");
    Serial.println(X_TOTAL_STEPS);

    // 1. Y-axis goes out (600 steps)
    Serial.println("Y-Axis: Moving forward...");
    moveStepper(Y_STEP_PIN, Y_DIR_PIN, DIR_FORWARD, Y_STROKE_STEPS, Y_SPEED_DELAY);
    delay(200); // Short pause for stability

    // 2. Y-axis returns (600 steps)
    Serial.println("Y-Axis: Returning to home...");
    moveStepper(Y_STEP_PIN, Y_DIR_PIN, DIR_BACKWARD, Y_STROKE_STEPS, Y_SPEED_DELAY);
    delay(500); // Pause before moving X

    // 3. X-axis climbs forward by increment (100 steps)
    Serial.println("X-Axis: Incremental step forward...");
    moveStepper(X_STEP_PIN, X_DIR_PIN, DIR_FORWARD, X_INCREMENT_STEPS, X_SPEED_DELAY);
    currentXPosition += X_INCREMENT_STEPS;
    
    delay(500); // Pause before next Y round
  }

  // 4. Return X-axis back to the starting point
  Serial.println("=== Cleaning Cycle Finished! ===");
  Serial.println("X-Axis: Returning to start position...");
  // Return X back 800 steps
  moveStepper(X_STEP_PIN, X_DIR_PIN, DIR_BACKWARD, X_TOTAL_STEPS, X_SPEED_DELAY);

  Serial.println("Cleaning routine completed. Resting...");
  delay(10000); // Wait 10 seconds before the next scheduled cleaning run
}

/**
 * Utility function to rotate a stepper motor
 * @param stepPin digital pin connected to STEP
 * @param dirPin digital pin connected to DIR
 * @param dir direction to turn (true/false)
 * @param steps number of steps to take
 * @param speedDelayUs delay in microseconds between step pulses
 */
void moveStepper(int stepPin, int dirPin, bool dir, int steps, int speedDelayUs) {
  digitalWrite(dirPin, dir ? HIGH : LOW);
  
  for (int i = 0; i < steps; i++) {
    digitalWrite(stepPin, HIGH);
    delayMicroseconds(10); // Minimum pulse duration for A4988 is 1-2us, 10us is safe
    digitalWrite(stepPin, LOW);
    delayMicroseconds(speedDelayUs);
  }
}
