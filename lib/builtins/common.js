"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toNumber = toNumber;
exports.toBoolean = toBoolean;
function toNumber(value) {
    return Number(value) || 0;
}
function toBoolean(value) {
    if (typeof value === "string") {
        if (value === "false")
            return false;
        if (value === "true")
            return true;
    }
    return !!value;
}
//# sourceMappingURL=common.js.map