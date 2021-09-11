import matplotlib.pyplot as plt
import serial
import re
import matplotlib.animation as animation
import threading
import time

ard = serial.Serial("COM3", 9600)
fig = plt.figure()
ax1 = fig.add_subplot(1,1,1)

winsize = 128

def animate(i):
    global PLOT_DATA
    ax1.clear()
    data = record()
    # ax1.set_title(data[-1])
    # ax1.plot(data[:-1])
    ax1.plot(PLOT_DATA, "+-")


PLOT_DATA = [0] * winsize

class MyThread(threading.Thread):

    def run(self):
        global PLOT_DATA
        while True:
            b = int.from_bytes(ard.read(1), byteorder="little")
            # b1 = int.from_bytes(ard.read(1), byteorder=order)
            # b2 = int.from_bytes(ard.read(1), byteorder=order)
            # b = b1 * 256 + b2
            # print(b)
            PLOT_DATA.pop(0)
            PLOT_DATA.append(b)


thread = MyThread(daemon=True)
thread.start()
ax1.set_xlim(0, winsize)
ax1.set_ylim(0, 1024)
ani = animation.FuncAnimation(fig, animate, interval=100)
plt.show()
