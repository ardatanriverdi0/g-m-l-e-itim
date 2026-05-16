#include <Arduino.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <Wire.h>

Adafruit_MPU6050 mpu;

// Kalibrasyon ve Filtre Değişkenleri
float pitchOffset = 0;
float rollOffset = 0;
float filteredPitch = 0;
float filteredRoll = 0;
float yaw = 0;
unsigned long lastTime = 0;
const float filterAlpha = 0.15; // Low-Pass Filter katsayısı

void setup(void) {
  Serial.begin(115200);
  while (!Serial)
    delay(10);

  if (!mpu.begin()) {
    while (1) {
      delay(10);
    }
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  // --- KALİBRASYON ---
  float pitchSum = 0;
  float rollSum = 0;
  int sampleCount = 100;
  
  for (int i = 0; i < sampleCount; i++) {
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);
    
    float ax = a.acceleration.x;
    float ay = a.acceleration.y;
    float az = a.acceleration.z;
    
    pitchSum += atan2(-ax, sqrt(ay * ay + az * az)) * 180.0 / PI;
    rollSum += atan2(ay, az) * 180.0 / PI;
    delay(20);
  }
  
  pitchOffset = pitchSum / sampleCount;
  rollOffset = rollSum / sampleCount;

  lastTime = millis();
  delay(100);
}

void loop() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  unsigned long currentTime = millis();
  float dt = (currentTime - lastTime) / 1000.0;
  lastTime = currentTime;

  float ax = a.acceleration.x;
  float ay = a.acceleration.y;
  float az = a.acceleration.z;

  // Ham ivmeölçer açı değerleri ve Offset çıkarımı
  float rawPitch = (atan2(-ax, sqrt(ay * ay + az * az)) * 180.0 / PI) - pitchOffset;
  float rawRoll = (atan2(ay, az) * 180.0 / PI) - rollOffset;

  // Düşük Geçiren Filtre
  filteredPitch = (filterAlpha * rawPitch) + ((1.0 - filterAlpha) * filteredPitch);
  filteredRoll = (filterAlpha * rawRoll) + ((1.0 - filterAlpha) * filteredRoll);

  // Yaw (Sapma) için Gyro entegrasyonu (Z ekseni rad/s -> derece/s)
  float gz = g.gyro.z * 180.0 / PI;
  // Çok küçük gyro titremelerini (drift) filtrele
  if(abs(gz) > 1.0) {
      yaw += gz * dt;
  }

  // G-Force (Şiddet) hesaplaması: İvme vektörünün uzunluğu / 9.81 m/s^2
  float gforce = sqrt(ax*ax + ay*ay + az*az) / 9.81;

  // JSON formatında gönder
  Serial.print("{\"pitch\":");
  Serial.print(filteredPitch);
  Serial.print(",\"roll\":");
  Serial.print(filteredRoll);
  Serial.print(",\"yaw\":");
  Serial.print(yaw);
  Serial.print(",\"gforce\":");
  Serial.print(gforce);
  Serial.println("}");

  delay(40); // Yaklaşık saniyede 25 okuma
}