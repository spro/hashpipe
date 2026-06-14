"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
// Random generators and sampling utilities.
function randstr(length = 5) {
    let value = "";
    while (value.length < length) {
        value += Math.random()
            .toString(36)
            .slice(2, length - value.length + 2);
    }
    return value;
}
function randint(max = 100) {
    return Math.floor(Math.random() * max);
}
function sampleSingle(list) {
    if (!list.length)
        return undefined;
    const index = Math.floor(Math.random() * list.length);
    return list[index];
}
function sampleMany(list, size) {
    if (size >= list.length) {
        return shuffle(list);
    }
    const copy = shuffle(list);
    return copy.slice(0, size);
}
function shuffle(list) {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
const randomBuiltins = {
    randstr: (0, helpers_1.command)((inp, args) => randstr(args[0])),
    randint: (0, helpers_1.command)((inp, args) => randint(args[0])),
    choice: (0, helpers_1.command)((inp) => sampleSingle(inp)),
    sample: (0, helpers_1.command)((inp, args) => {
        const requested = Number(args[0]);
        const size = Number.isFinite(requested)
            ? Math.max(0, Math.floor(requested))
            : Math.floor(inp.length / 2);
        return sampleMany(inp, size);
    }),
};
exports.default = randomBuiltins;
//# sourceMappingURL=random.js.map