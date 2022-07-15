export function storageAvailable(type) {
    var storage;
    try {
        storage = window[type];
        var x = "__storage_test__";
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    } catch (e) {
        return e instanceof DOMException && (
                e.code === 22 ||
                e.code === 1014 ||
                e.name === "QuotaExceededError" ||
                e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
            (storage && storage.length !== 0);
    }
}

const slotDurationPattern = /^(\d+)h(\d+)? \- (\d+)h(\d+)?$/;

export function get_slot_duration(slot) {
    let match = slot.match(slotDurationPattern);
    return parseInt(match[3]) +
        (match[4] ? parseInt(match[4]) / 60 : 0) -
        parseInt(match[1]) -
        (match[2] ? parseInt(match[2]) / 60 : 0);
}

export function get(object, key, default_value) {
    var result = object[key];
    return (typeof result !== "undefined") ? result : default_value;
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length * 2; i++) {
        hash = str.charCodeAt(i % str.length) + ((hash << 5) - hash);
    }
    return hash;
}

function intToRGB(i) {
    let c = (i & 0x00FFFFFF).toString(16).toUpperCase();
    return "00000".substring(0, 6 - c.length) + c;
}

export function hashColor(str) {
    return `#${intToRGB(hashCode(str))}`;
}