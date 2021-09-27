#define WAVE_IN A0
#define DELIMITER 42
#define DELIMITER_LENGTH 5

#define SAMPLE_FREQUENCY 4096 // Hz
#define EXPECTED_THRESHOLD_CROSSINGS 10
#define SAMPLING_SIZE 512

int samples[SAMPLING_SIZE];
unsigned long sampling_period = int(1000000. / SAMPLE_FREQUENCY);
const int sample_size = SAMPLING_SIZE;

unsigned long t_first;
unsigned long t_last;
unsigned long t_prev;
unsigned long t_cur;
int v_prev;
int v_cur;
int v_min;
int v_max;
int v_threshold;

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
  for (int i = 0; i < SAMPLING_SIZE; i++)
  {
    Serial.write((byte)round(samples[i] / 4));
  }
}

void acquire_samples()
{
  unsigned long start = micros();
  for (int i = 0; i < SAMPLING_SIZE; i++)
  {
    unsigned long now = micros();
    samples[i] = analogRead(WAVE_IN);
    while (micros() - now < sampling_period)
    {
      // pass
    }
  }
}

void estimate_threshold()
{
    for (int i = 0; i < SAMPLING_SIZE; i++)
    {
        v_cur = analogRead(WAVE_IN);
        if (v_cur < v_min)
        {
            v_min = v_cur;
        }
        if (v_cur > v_max)
        {
            v_max = v_cur;
        }
    }
    v_threshold = (v_min + v_max) / 2;
}

void timed_analog_read()
{
    v_cur = analogRead(WAVE_IN);
    t_cur = micros();
}

float compute_threshold_time()
{
    float alpha = (float)(v_threshold - v_prev) / (float)(v_cur - v_prev);
    return (1. - alpha) * (float)t_prev + alpha * t_cur; 
}

float compute_frequency()
{
    bool found = false;
    int count = 0;
    while (!found)
    {
        estimate_threshold();
        timed_analog_read();
        v_prev = v_cur;
        t_prev = t_cur;
        for (int i = 0; i < SAMPLING_SIZE; i++)
        {
            timed_analog_read();
            if (v_prev <= v_threshold && v_cur >= v_threshold)
            {
                t_first = compute_threshold_time();
                found = true;
                break;
            }
        }
    }
    while (count < EXPECTED_THRESHOLD_CROSSINGS)
    {
        timed_analog_read();
        if (v_prev <= v_threshold && v_cur >= v_threshold)
        {
            count++;
            if (count == EXPECTED_THRESHOLD_CROSSINGS)
            {
                t_last = compute_threshold_time();
            }
        }
    }
    return (float)count / (t_last - t_first);
}
