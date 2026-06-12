import { inspect } from "util";
export type Callback<T = any> = (err: any, result?: T) => void;
export type HashpipeFunction = (inp: any, args: any[], ctx: any, cb: Callback) => void;
export type PipelineRunner = (pipelines: any[], inp: any, ctx: any, cb: Callback) => void;
export declare function setLambdaRunner(runner: PipelineRunner): void;
export declare class Lambda {
    tokens: any[];
    params: string[];
    ctx: any;
    src?: string | undefined;
    constructor(tokens: any[], params: string[], ctx: any, src?: string | undefined);
    call(inp: any, args: any[], cb: Callback): void;
    private display;
    toString(): string;
    toJSON(): string;
    [inspect.custom](): string;
}
export declare function prettyPrint(o: any): string;
export declare function wrapone(f: (...args: any[]) => void, with_inp?: boolean): HashpipeFunction;
export declare function wraponeSync(f: (...args: any[]) => any, with_inp?: boolean): HashpipeFunction;
export declare function wrapall(o: Record<string, any>, pre?: string, with_inp?: boolean, sync?: boolean): Record<string, HashpipeFunction>;
//# sourceMappingURL=helpers.d.ts.map