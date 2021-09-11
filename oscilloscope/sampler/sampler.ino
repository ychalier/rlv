#define WAVE_IN A0
#define SAMPLE_SIZE 128
#define SAMPLE_FREQUENCY 2048 // Hz

int sample[SAMPLE_SIZE];
unsigned long sample_period = int(1000000 / SAMPLE_FREQUENCY);

void setup() {
  pinMode(WAVE_IN, INPUT);
  Serial.begin(9600);
}

void loop() {
  if (Serial.availableForWrite() > 2)
  {
    record_samples();
    for (int i = 0; i < SAMPLE_SIZE; i++)
    {
      Serial.write((byte) (sample[i] & 255));
    }
  }
}

void record_samples()
{
  for (int i = 0; i < SAMPLE_SIZE; i++)
  {
    unsigned long now = micros();
    sample[i] = analogRead(WAVE_IN);
    while(micros() - now < sample_period)
    {
      // pass
    }
  }
}
