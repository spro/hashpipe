"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const core_1 = __importDefault(require("./core"));
const math_1 = __importDefault(require("./math"));
const strings_1 = __importDefault(require("./strings"));
const collections_1 = __importDefault(require("./collections"));
const json_1 = __importDefault(require("./json"));
const debug_1 = __importDefault(require("./debug"));
const random_1 = __importDefault(require("./random"));
const time_1 = __importDefault(require("./time"));
const environment_1 = __importDefault(require("./environment"));
const meta_1 = __importDefault(require("./meta"));
const help_1 = __importDefault(require("./help"));
// Aggregate builtins so existing imports keep working.
const builtins = {
    ...core_1.default,
    ...math_1.default,
    ...strings_1.default,
    ...collections_1.default,
    ...json_1.default,
    ...debug_1.default,
    ...random_1.default,
    ...time_1.default,
    ...environment_1.default,
    ...meta_1.default,
    ...help_1.default,
};
module.exports = builtins;
//# sourceMappingURL=index.js.map