#define WAVE_IN A0
#define SAMPLE_SIZE 512
#define SAMPLE_FREQUENCY 4096 // Hz
#define DELIMITER 42
#define DELIMITER_LENGTH 5

int samples[SAMPLE_SIZE];
unsigned long sampling_period = int(1000000. / SAMPLE_FREQUENCY);
const int sample_size = SAMPLE_SIZE;

void setup()
{
  pinMode(WAVE_IN, INPUT);
  Serial.begin(9600);
}

void loop()
{
  acquire_samples();
  float frequency = compute_frequency();
  for (int i = 0; i < DELIMITER_LENGTH; i++)
  {
    Serial.write((byte)DELIMITER);
  }
  Serial.write((byte *)&sample_size, 2);
  Serial.write((byte *)&frequency, 4);
  for (int i = 0; i < SAMPLE_SIZE; i++)
  {
    Serial.write((byte)round(samples[i] / 4));
  }
}

void acquire_samples()
{
  for (int i = 0; i < SAMPLE_SIZE; i++)
  {
    unsigned long now = micros();
    samples[i] = analogRead(WAVE_IN);
    while (micros() - now < sampling_period)
    {
      // pass
    }
  }
}

int count_crossings_rising(int frontier)
{
  int crossings = 0;
  for (int i = 0; i < SAMPLE_SIZE - 1; i++)
  {
    if (samples[i] <= frontier && samples[i + 1] >= frontier)
    {
      crossings++;
    }
  }
  return crossings;
}

void count_crossings(int frontier, int &rising, int &falling)
{
  rising = 0;
  falling = 0;
  for (int i = 0; i < SAMPLE_SIZE - 1; i++)
  {
    if (samples[i] <= frontier && samples[i + 1] >= frontier)
    {
      rising++;
    }
    if (samples[i] >= frontier && samples[i + 1] <= frontier)
    {
      falling++;
    }
  }
}

float compute_frequency()
{
  int min = 1024;
  int max = 0;
  for (int i = 0; i < SAMPLE_SIZE; i++)
  {
    if (samples[i] > max)
    {
      max = samples[i];
    }
    if (samples[i] < min)
    {
      min = samples[i];
    }
  }
  int rising, falling;
  count_crossings((max + min) / 2, rising, falling);
  int crossings = (rising + falling) / 2;
  return (float)crossings / (float)(SAMPLE_SIZE * (float)sampling_period / 1000000.);
}