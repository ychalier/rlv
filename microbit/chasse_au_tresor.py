from microbit import *
import radio
import music
import machine

MODE_SENDER = True
MODE_RECEIVER = True

RADIO_GROUP = 12
RADIO_POWER = 5

RSSI_MIN = -90
RSSI_MAX = -50

DELAY_TIMEOUT = 2000 # ms
DELAY_PING = 200 # ms
DELAY_BIP = 80 # ms

BIP_PITCH = 220

BPM_MIN = 12
BPM_MAX = 250

BLANK_IMAGE = Image("00000:00000:00000:00000:00000")

set_volume(128)

radio.config(group=RADIO_GROUP, power=RADIO_POWER)
radio.on()

def create_rssi_image(rssi, rows=5, cols=5, lum=9):
    n = rows * cols * lum
    x = max(0, min(n, (rssi - RSSI_MIN) / (RSSI_MAX - RSSI_MIN) * n))
    k = x // lum
    image_str = ""
    p = 0
    for i in range(rows):
        for j in range(cols):
            p += 1
            if p <= k:
                image_str += "9"
            elif p == k + 1:
                image_str += str(int(x - lum * k))
            else:
                image_str += "0"
        image_str += ":"
    return Image(image_str[:-1])

def get_rssi_bip_period(rssi):
    bpm = (rssi - RSSI_MIN) / (RSSI_MAX - RSSI_MIN) * (BPM_MAX - BPM_MIN) + BPM_MIN
    return 60000 / bpm # ms

class Receiver:

    def __init__(self, active):
        self.active = active
        self.last_bip_ms = 0
        self.next_bip_in_ms = 60000 / BPM_MIN
        self.image = BLANK_IMAGE
        self.previous_messages = dict()

    def setup(self):
        if not self.active: return
        pass

    def check_for_messages(self):
        details = radio.receive_full()
        if details is None:
            return
        sender_id, rssi, timestamp = details
        self.previous_messages[sender_id] = (rssi, timestamp)

    def delete_old_messages(self):
        now = running_time()
        keys_to_delete = []
        for sender_id, (rssi, timestamp) in self.previous_messages.items():
            if now * 1000 - timestamp >= DELAY_TIMEOUT * 1000:
                keys_to_delete.append(sender_id)
        for sender_id in keys_to_delete:
            del self.previous_messages[sender_id]

    def update_status(self):
        if len(self.previous_messages) == 0:
            self.image = BLANK_IMAGE
            self.next_bip_in_ms = 10**9
        else:
            rssi = max(map(lambda x: x[0], self.previous_messages.values()))
            self.image = create_rssi_image(rssi)
            self.next_bip_in_ms = get_rssi_bip_period(rssi)
        
    def update(self):
        if not self.active: return
        self.check_for_messages()
        self.delete_old_messages()
        self.update_status()
        display.show(self.image)
        now = running_time()
        if now - self.last_bip_ms >= self.next_bip_in_ms:
            self.last_bip_ms = now
            music.pitch(BIP_PITCH)
            sleep(DELAY_BIP)
            music.stop()

class Sender:

    def __init__(self, active):
        self.active = active
        self.last_ping = 0

    def setup(self):
        if not self.active: return
        display.show(Image.TARGET)

    def update(self):
        if not self.active: return
        now = running_time()
        if now - self.last_ping >= DELAY_PING:
            radio.send_bytes(machine.unique_id())
            self.last_ping = now

receiver = Receiver(True)
sender = Sender(False)

receiver.setup()
sender.setup()

while True:
    receiver.update()
    sender.update()
