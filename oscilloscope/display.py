import matplotlib.pyplot
import matplotlib.animation
import threading
import serial


OPERATING_VOLTAGE = 5
MAX_RESOLUTION = 256
SAMPLING_FREQUENCY = 4096
WINSIZE = int(.1 * SAMPLING_FREQUENCY)


WINDOW = [0] * WINSIZE
TIMES = [1000. * i / SAMPLING_FREQUENCY for i in range(WINSIZE)]
FIGURE = matplotlib.pyplot.figure()
AXIS = FIGURE.add_subplot(1, 1, 1)


def animate(_):
    global AXIS
    global WINDOW
    global TIMES
    AXIS.clear()
    AXIS.plot(TIMES, WINDOW, "+-", linewidth=.5)
    AXIS.set_ylabel("Voltage (V)")
    AXIS.set_xlabel("Time (ms)")


class SamplerThread(threading.Thread):

    def run(self):
        global WINDOW
        arduino = serial.Serial("COM3", 9600)
        while True:
            b = int.from_bytes(arduino.read(1), byteorder="little")
            WINDOW.pop(0)
            WINDOW.append(float(b) / MAX_RESOLUTION * OPERATING_VOLTAGE)


if __name__ == "__main__":
    SamplerThread(daemon=True).start()
    animation = matplotlib.animation.FuncAnimation(FIGURE, animate, interval=50)
    matplotlib.pyplot.show()
