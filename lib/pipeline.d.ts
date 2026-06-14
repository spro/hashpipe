import { HashpipeFunction, Lambda } from "./helpers";
export interface AtExpression {
    get?: any;
    map?: any;
    sub?: any[];
    depth?: number;
}
export interface CommandToken {
    cmd?: any[];
    at?: AtExpression[];
    type?: string;
    val?: any;
    var?: string;
    sub?: any[];
    expr?: ExprNode;
}
export interface ExprNode {
    op?: string;
    left?: ExprNode;
    right?: ExprNode;
    val?: any;
    var?: string;
    sub?: any[];
}
export interface ScopeInit {
    parent?: Scope;
    vars?: Record<string, any>;
    fns?: Record<string, HashpipeFunction>;
    aliases?: Record<string, string>;
    [key: string]: any;
}
export declare class Scope {
    parent?: Scope;
    vars?: Record<string, any>;
    fns?: Record<string, HashpipeFunction>;
    aliases?: Record<string, string>;
    [key: string]: any;
    constructor(init?: ScopeInit);
    set(t: string, k: string, v: any): this;
    get(t: string, k?: string): any;
    alias(a: string, s: string | Lambda): void;
    subScope(init?: ScopeInit): Scope;
    topScope(): Scope;
}
export declare class Context extends Scope {
}
export declare class Pipeline extends Scope {
    private lastRegisteredFns;
    private lastShadowedFns;
    use(fns: string | Record<string, HashpipeFunction>): this;
    getLastRegisteredFns(): string[];
    getLastShadowedFns(): string[];
    exec(script: string, inp?: any, ctx?: Scope): Promise<any>;
    execFile(script_filename: string, inp: any, ctx?: Scope): Promise<any>;
}
export declare function parsePipelines(cmd: string): any[];
export declare function runPipeline(_cmd_tokens: CommandToken[], inp: any, ctx: Scope): Promise<any>;
export type PipeHandler = (inp: any, ctx: Scope, runStage: (inp: any) => Promise<any>) => Promise<any>;
export declare function registerPipeOperator(op: string, handler: PipeHandler): void;
export declare function doCmd(_args: any[], inp: any, ctx: Scope): Promise<any>;
export declare function at(inp: any, expr: AtExpression[], ctx: Scope): Promise<any>;
//# sourceMappingURL=pipeline.d.ts.map