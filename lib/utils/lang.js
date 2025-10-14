"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flattenOnce = exports.cloneShallow = exports.isObject = exports.isString = exports.isFunction = void 0;
const isFunction = (value) => typeof value === "function";
exports.isFunction = isFunction;
const isString = (value) => typeof value === "string" || value instanceof String;
exports.isString = isString;
const isObject = (value) => value !== null && typeof value === "object";
exports.isObject = isObject;
const cloneShallow = (value) => {
    if (Array.isArray(value)) {
        return value.slice();
    }
    if ((0, exports.isObject)(value)) {
        return { ...value };
    }
    return value;
};
exports.cloneShallow = cloneShallow;
const flattenOnce = (list) => {
    const result = [];
    for (const item of list) {
        if (Array.isArray(item)) {
            result.push(...item);
        }
        else {
            result.push(item);
        }
    }
    return result;
};
exports.flattenOnce = flattenOnce;
//# sourceMappingURL=lang.js.map