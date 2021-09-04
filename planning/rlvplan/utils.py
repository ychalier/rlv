import re


def cast_nint(string):
    if string is None:
        return 0
    return int(string)


def get_slot_duration(slot):
    pattern = re.compile(r"^(\d+)h(\d+)? \- (\d+)h(\d+)?$")
    match = pattern.match(slot)
    return cast_nint(match.group(3)) + cast_nint(match.group(4)) / 60 - (cast_nint(match.group(1)) + cast_nint(match.group(2)) / 60)