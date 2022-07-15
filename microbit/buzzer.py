from microbit import *
import radio
import random
import music
import struct
import machine

COOLDOWN_DURATION = 10000 # ms
RADIO_GROUP = 17
RADIO_POWER = 3

set_volume(255)
radio.config(group=RADIO_GROUP, power=RADIO_POWER)
radio.on()

LETTERS = list("abcdefghijklmnopqrstuvwxyz")

STATE_READY = 0
STATE_IDLE = 1
STATE_ARMED = 2
STATE_FIRED = 3

IMAGE_ARMED = Image("00900:06960:09990:06960:00900")
IMAGE_READY = Image("96369:60006:30003:60006:96369")
IMAGE_FIRED = Image("99999:99999:99999:99999:99999")
IMAGE_IDLE = Image("00000:00000:00000:00000:00000")

MSG_TRIGGER = "t"
MSG_CONCEDE = "c"

def microbit_friendly_name():
    length = 5
    letters = 5
    codebook = [
        ['z', 'v', 'g', 'p', 't'],
        ['u', 'o', 'i', 'e', 'a'],
        ['z', 'v', 'g', 'p', 't'],
        ['u', 'o', 'i', 'e', 'a'],
        ['z', 'v', 'g', 'p', 't']
    ]
    name = []
    _, n = struct.unpack("II", machine.unique_id())
    ld = 1
    d = letters
    for i in range(0, length):
        h = (n % d) // ld
        n -= h;
        d *= letters
        ld *= letters
        name.insert(0, codebook[i][h])
    return "".join(name)

def was_button_pressed():
    a = button_a.was_pressed()
    b = button_b.was_pressed()
    return a or b

def retrieve_messages():
    messages = []
    while True:
        message = radio.receive()
        if message is None:
            break
        else:
            messages.append(Message.from_string(message))
    return messages

class Message:

    def __init__(self, type, challenge=None):
        self.type = type
        self.challenge = challenge

    @classmethod
    def from_string(cls, string):
        split = string.split(",")
        if split[0] == MSG_CONCEDE:
            return cls(MSG_CONCEDE)
        elif split[0] == MSG_TRIGGER:
            return cls(MSG_TRIGGER, split[1])
        return cls(None)

def generate_random_string(length=4):
    choices = []
    for _ in range(length):
        choices.append(random.choice(LETTERS))
    return "".join(choices)

class Buzzer:

    def __init__(self):
        self.state = STATE_READY
        self.cooldown = 0
        self.challenge = None

    def update(self):
        now = running_time()
        button_pressed = was_button_pressed()
        cooldown_expired = now - self.cooldown > COOLDOWN_DURATION
        messages = retrieve_messages()
        if self.state == STATE_READY:
            for message in messages:
                if message.type == MSG_TRIGGER or message.type == MSG_ARMED:
                    radio.send(MSG_CONCEDE + ",")
                    self.cooldown = now
                    display.show(IMAGE_IDLE)
                    self.state = STATE_IDLE
                    return
            if button_pressed:
                self.challenge = generate_random_string() + microbit_friendly_name()
                radio.send(MSG_TRIGGER + "," + self.challenge)
                display.show(IMAGE_ARMED)
                self.state = STATE_ARMED
                return
        elif self.state == STATE_ARMED:
            for message in messages:
                if message.type == MSG_CONCEDE:
                    self.cooldown = now
                    self.state = STATE_FIRED
                    display.show(IMAGE_FIRED)
                    music.play(music.POWER_UP)
                    return
                if message.type == MSG_TRIGGER:
                    self.cooldown = now
                    if self.challenge < message.challenge:
                        # Challenge succeeds
                        display.show(IMAGE_FIRED)
                        music.play(music.POWER_UP)
                        self.state = STATE_FIRED
                    else:
                        # Challenge fails
                        radio.send(MSG_CONCEDE + ",")
                        display.show(IMAGE_IDLE)
                        self.state = STATE_IDLE
                    return
            radio.send(MSG_TRIGGER + "," + self.challenge)
        elif self.state == STATE_IDLE or self.state == STATE_FIRED:
            for message in messages:
                if message.type == MSG_TRIGGER:
                    if self.state == STATE_IDLE:
                        radio.send(MSG_CONCEDE + ",")
                        self.cooldown = now
                    elif self.state == STATE_FIRED:
                        radio.send(MSG_TRIGGER + "," + self.challenge)
                        self.cooldown = now
            if cooldown_expired:
                self.challenge = None
                display.show(IMAGE_READY)
                self.state = STATE_READY

display.show(IMAGE_READY)
buzzer = Buzzer()

while True:
    buzzer.update()
