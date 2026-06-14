import { inspect } from "util";
export type MaybePromise<T = any> = T | PromiseLike<T>;
export type HashpipeFunction = (inp: any, args: any[], ctx: any) => MaybePromise;
export type PipelineRunner = (pipelines: any[], inp: any, ctx: any) => Promise<any>;
export declare function setLambdaRunner(runner: PipelineRunner): void;
export declare class Lambda {
    tokens: any[];
    params: string[];
    ctx: any;
    src?: string | undefined;
    constructor(tokens: any[], params: string[], ctx: any, src?: string | undefined);
    call(inp: any, args: any[]): Promise<any>;
    private display;
    toString(): string;
    toJSON(): string;
    [inspect.custom](): string;
}
export declare function prettyPrint(o: any): string;
export declare function wrapone(f: (...args: any[]) => void, with_inp?: boolean): HashpipeFunction;
export declare function isPromiseLike<T = any>(value: any): value is PromiseLike<T>;
export declare function command<T = any>(fn: (inp: any, args: any[], ctx: any) => MaybePromise<T>): HashpipeFunction;
export declare function wraponeSync(f: (...args: any[]) => any, with_inp?: boolean): HashpipeFunction;
export declare function wrapall(o: Record<string, any>, pre?: string, with_inp?: boolean, sync?: boolean): Record<string, HashpipeFunction>;
//# sourceMappingURL=helpers.d.ts.map