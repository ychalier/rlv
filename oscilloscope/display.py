import matplotlib.pyplot
import matplotlib.animation
import threading
import serial
import struct


OPERATING_VOLTAGE = 5
MAX_RESOLUTION = 256
SAMPLING_FREQUENCY = 4096
WINSIZE = int(.1 * SAMPLING_FREQUENCY)


WINDOW = [0] * WINSIZE
TIMES = [1000. * i / SAMPLING_FREQUENCY for i in range(WINSIZE)]
FIGURE = matplotlib.pyplot.figure()
AXIS = FIGURE.add_subplot(1, 1, 1)
FREQUENCY = 0


def animate(_):
    global AXIS
    global WINDOW
    global TIMES
    global FREQUENCY
    AXIS.clear()
    AXIS.plot(TIMES, WINDOW, "+-", linewidth=.5)
    AXIS.set_ylabel("Voltage (V)")
    AXIS.set_xlabel("Time (ms)")
    AXIS.set_title("Detected Frequency: %.2f Hz" % FREQUENCY)


class SamplerThread(threading.Thread):

    def run(self):
        global WINDOW
        global FREQUENCY
        arduino = serial.Serial("COM3", 9600)
        consecutive = 0
        delimiter = 42
        while True:
            x = int.from_bytes(arduino.read(1), byteorder="little")
            if x == delimiter:
                consecutive += 1
            else:
                consecutive = 0
            if consecutive >= 5:
                consecutive = 0
                sample_size = int.from_bytes(arduino.read(2), byteorder="little")
                FREQUENCY = struct.unpack("f", arduino.read(4))[0]
                print("Received packet: %d, %.2f Hz" % (sample_size, FREQUENCY))
                for _ in range(sample_size):
                    b = int.from_bytes(arduino.read(1), byteorder="little")
                    WINDOW.pop(0)
                    WINDOW.append(float(b) / MAX_RESOLUTION * OPERATING_VOLTAGE)         


if __name__ == "__main__":
    SamplerThread(daemon=True).start()
    animation = matplotlib.animation.FuncAnimation(FIGURE, animate, interval=50)
    matplotlib.pyplot.show()
