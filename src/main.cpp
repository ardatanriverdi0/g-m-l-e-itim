#include <Arduino.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

Adafruit_MPU6050 mpu1; // 0x68 (AD0 Low)
Adafruit_MPU6050 mpu2; // 0x69 (AD0 High)

// Kalibrasyon Değişkenleri
float pOff1 = 0, rOff1 = 0;
float pOff2 = 0, rOff2 = 0;
float fP1 = 0, fR1 = 0, fP2 = 0, fR2 = 0;
float yaw1 = 0; 
unsigned long lastTime = 0;
const float filterAlpha = 0.15;

void setup(void) {
  Serial.begin(115200);
  while (!Serial) delay(10);

  bool ok1 = mpu1.begin(0x68);
  bool ok2 = mpu2.begin(0x69);

  if (!ok1 && !ok2) {
    while (1) delay(10);
  }

  // Setup MPU1
  if(ok1) {
    mpu1.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu1.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu1.setFilterBandwidth(MPU6050_BAND_21_HZ);
  }

  // Setup MPU2
  if(ok2) {
    mpu2.setAccelerometerRange(MPU6050_RANGE_8_G);
    mpu2.setGyroRange(MPU6050_RANGE_500_DEG);
    mpu2.setFilterBandwidth(MPU6050_BAND_21_HZ);
  }

  // Calibration (Simple 50 samples)
  float pS1 = 0, rS1 = 0, pS2 = 0, rS2 = 0;
  int samples = 50;
  for (int i = 0; i < samples; i++) {
    sensors_event_t a1, g1, t1, a2, g2, t2;
    if(ok1) {
        mpu1.getEvent(&a1, &g1, &t1);
        pS1 += atan2(-a1.acceleration.x, sqrt(a1.acceleration.y * a1.acceleration.y + a1.acceleration.z * a1.acceleration.z)) * 180.0 / PI;
        rS1 += atan2(a1.acceleration.y, a1.acceleration.z) * 180.0 / PI;
    }
    if(ok2) {
        mpu2.getEvent(&a2, &g2, &t2);
        pS2 += atan2(-a2.acceleration.x, sqrt(a2.acceleration.y * a2.acceleration.y + a2.acceleration.z * a2.acceleration.z)) * 180.0 / PI;
        rS2 += atan2(a2.acceleration.y, a2.acceleration.z) * 180.0 / PI;
    }
    delay(10);
  }
  pOff1 = pS1 / samples; rOff1 = rS1 / samples;
  pOff2 = pS2 / samples; rOff2 = rS2 / samples;

  lastTime = millis();
}

void loop() {
  sensors_event_t a1, g1, t1, a2, g2, t2;
  mpu1.getEvent(&a1, &g1, &t1);
  mpu2.getEvent(&a2, &g2, &t2);

  unsigned long currentTime = millis();
  float dt = (currentTime - lastTime) / 1000.0;
  lastTime = currentTime;

  // IMU 1 (Control)
  float rP1 = (atan2(-a1.acceleration.x, sqrt(a1.acceleration.y * a1.acceleration.y + a1.acceleration.z * a1.acceleration.z)) * 180.0 / PI) - pOff1;
  float rR1 = (atan2(a1.acceleration.y, a1.acceleration.z) * 180.0 / PI) - rOff1;
  fP1 = (filterAlpha * rP1) + ((1.0 - filterAlpha) * fP1);
  fR1 = (filterAlpha * rR1) + ((1.0 - filterAlpha) * fR1);
  
  float gz1 = g1.gyro.z * 180.0 / PI;
  if(abs(gz1) > 1.0) yaw1 += gz1 * dt;
  float gf1 = sqrt(a1.acceleration.x*a1.acceleration.x + a1.acceleration.y*a1.acceleration.y + a1.acceleration.z*a1.acceleration.z) / 9.81;

  // IMU 2 (Gestures)
  float rP2 = (atan2(-a2.acceleration.x, sqrt(a2.acceleration.y * a2.acceleration.y + a2.acceleration.z * a2.acceleration.z)) * 180.0 / PI) - pOff2;
  float rR2 = (atan2(a2.acceleration.y, a2.acceleration.z) * 180.0 / PI) - rOff2;
  fP2 = (filterAlpha * rP2) + ((1.0 - filterAlpha) * fP2);
  fR2 = (filterAlpha * rR2) + ((1.0 - filterAlpha) * fR2);

  // Send JSON
  Serial.print("{\"p1\":"); Serial.print(fP1);
  Serial.print(",\"r1\":"); Serial.print(fR1);
  Serial.print(",\"y1\":"); Serial.print(yaw1);
  Serial.print(",\"g1\":"); Serial.print(gf1);
  Serial.print(",\"p2\":"); Serial.print(fP2);
  Serial.print(",\"r2\":"); Serial.print(fR2);
  Serial.println("}");

  delay(40);
}