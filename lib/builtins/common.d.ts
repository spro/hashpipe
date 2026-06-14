import type { HashpipeFunction, MaybePromise } from "../helpers";
export type BuiltinMap = Record<string, HashpipeFunction>;
export type Callable = (inp: any, args: any[]) => MaybePromise;
export declare function resolveCallable(arg: any, ctx: any): Callable | null;
export declare function toNumber(value: any): number;
export declare function toBoolean(value: any): boolean;
//# sourceMappingURL=common.d.ts.map