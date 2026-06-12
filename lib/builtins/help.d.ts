import { inspect } from "util";
import type { BuiltinMap } from "./common";
export interface HelpExample {
    cmd: string;
    note: string;
}
export interface HelpSection {
    title: string;
    lines?: string[];
    examples?: HelpExample[];
}
export declare class HelpPage {
    title: string;
    sections: HelpSection[];
    docs: string;
    constructor(title: string, sections: HelpSection[], docs?: string);
    text(): string;
    toString(): string;
    toJSON(): string;
    [inspect.custom](): string;
}
declare const helpBuiltins: BuiltinMap;
export default helpBuiltins;
//# sourceMappingURL=help.d.ts.map