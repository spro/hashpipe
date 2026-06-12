"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelpPage = void 0;
const util_1 = require("util");
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
const DOCS_URL = "https://github.com/spro/hashpipe/blob/master/docs/Syntax.md";
class HelpPage {
    constructor(title, sections, docs = DOCS_URL) {
        this.title = title;
        this.sections = sections;
        this.docs = docs;
    }
    text() {
        const out = [this.title, ""];
        for (const section of this.sections) {
            out.push(section.title);
            for (const line of section.lines || []) {
                out.push("  " + line);
            }
            const examples = section.examples || [];
            const width = Math.min(48, Math.max(0, ...examples.map((e) => e.cmd.length)));
            for (const ex of examples) {
                out.push("  " + ex.cmd.padEnd(width) + "  # " + ex.note);
            }
            out.push("");
        }
        out.push("Full syntax guide: " + this.docs);
        return out.join("\n");
    }
    toString() {
        return this.text();
    }
    toJSON() {
        return this.text();
    }
    [util_1.inspect.custom]() {
        return this.text();
    }
}
exports.HelpPage = HelpPage;
const categories = [
    ["core", core_1.default],
    ["math", math_1.default],
    ["strings", strings_1.default],
    ["collections", collections_1.default],
    ["json", json_1.default],
    ["debug", debug_1.default],
    ["random", random_1.default],
    ["time", time_1.default],
    ["environment", environment_1.default],
    ["meta", meta_1.default],
];
function commandLines(ctx) {
    const lines = categories.map(([name, map]) => name.padEnd(13) + Object.keys(map).sort().join(" "));
    try {
        const loaded = Object.keys(ctx.topScope().fns || {}).sort();
        if (loaded.length) {
            lines.push("loaded".padEnd(13) + loaded.join(" "));
        }
    }
    catch {
        // no scope chain available; skip the loaded line
    }
    return lines;
}
function buildHelpPage(ctx) {
    return new HelpPage("hashpipe — a JSON shell", [
        {
            title: "Pipes",
            examples: [
                {
                    cmd: "echo one two three | split ' '",
                    note: "pipe output into the next command",
                },
                {
                    cmd: "[1, 2, 3, 4] || * 5",
                    note: "parallel pipe: map over a list",
                },
                {
                    cmd: "list 1 2 3 |= + 1",
                    note: "series pipe: map one at a time",
                },
                {
                    cmd: "no-such-command |? val recovered",
                    note: "error pipe: catch a failed stage",
                },
            ],
        },
        {
            title: "Values and variables",
            examples: [
                {
                    cmd: '{name: "Fred", age: 42}',
                    note: "JSON literals are values",
                },
                {
                    cmd: "$x = 6 ; $x * 7",
                    note: "variables and infix expressions",
                },
                {
                    cmd: "list a b c | length | echo counted $!",
                    note: "$! is the last output",
                },
            ],
        },
        {
            title: "At-expressions",
            examples: [
                {
                    cmd: '{name: "Fred", age: 42} @ name',
                    note: "get a key",
                },
                {
                    cmd: "[{n: 1}, {n: 2}, {n: 3}] @ :n",
                    note: "map a key over a list",
                },
                {
                    cmd: '{name: "Fred", age: 42} @ {who: name}',
                    note: "pluck into a new shape",
                },
            ],
        },
        {
            title: "Functions",
            examples: [
                {
                    cmd: "5 | {| * 2 }",
                    note: "a lambda is a pipeline in a box",
                },
                {
                    cmd: "def dog-years { $n | $n * 7 } ; dog-years 6",
                    note: "define named commands",
                },
                {
                    cmd: "[1, 2, 3] | map {| * 10 }",
                    note: "higher-order commands take lambdas",
                },
                {
                    cmd: "[{age: 58}, {age: 6}] | filter {| $(@ age) > 30 }",
                    note: "comparisons make predicates",
                },
            ],
        },
        {
            title: "HTTP",
            examples: [
                {
                    cmd: "http.get https://api.github.com/repos/spro/hashpipe @ name",
                    note: "fetch JSON from an API",
                },
            ],
        },
        {
            title: "Commands",
            lines: commandLines(ctx),
        },
    ]);
}
const helpBuiltins = {
    help: (inp, args, ctx, cb) => {
        cb(null, buildHelpPage(ctx));
    },
};
categories.push(["help", helpBuiltins]);
exports.default = helpBuiltins;
//# sourceMappingURL=help.js.map