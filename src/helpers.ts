import { inspect } from "util"

export type Callback<T = any> = (err: any, result?: T) => void
export type HashpipeFunction = (
    inp: any,
    args: any[],
    ctx: any,
    cb: Callback,
) => void

// A first-class function value: an unevaluated pipeline plus the scope it
// was created in. Invocation runs the body in a child of the captured scope
// with declared names bound positionally from args — a name with no matching
// argument receives the piped input — and the rest available as $args.
// The runner is injected by pipeline.ts to avoid a circular import.

export type PipelineRunner = (
    pipelines: any[],
    inp: any,
    ctx: any,
    cb: Callback,
) => void

let lambdaRunner: PipelineRunner | null = null

export function setLambdaRunner(runner: PipelineRunner): void {
    lambdaRunner = runner
}

export class Lambda {
    constructor(
        public tokens: any[],
        public params: string[],
        public ctx: any,
        public src?: string,
    ) {}

    call(inp: any, args: any[], cb: Callback): void {
        if (!lambdaRunner) {
            return cb("Lambda runner not initialized")
        }
        const scope =
            this.ctx && typeof this.ctx.subScope === "function"
                ? this.ctx.subScope({ vars: {} })
                : this.ctx
        this.params.forEach((param, i) => {
            scope.set("vars", param, i < args.length ? args[i] : inp)
        })
        scope.set("vars", "args", args.slice(this.params.length))
        lambdaRunner(this.tokens, inp, scope, cb)
    }

    private display(): string {
        return this.src ?? "{| ... }"
    }

    toString(): string {
        return this.display()
    }

    toJSON(): string {
        return this.display()
    }

    [inspect.custom](): string {
        return this.display()
    }
}

export function prettyPrint(o: any): string {
    if (typeof o === "object") {
        return inspect(o, { depth: null, colors: true })
    } else {
        return String(o)
    }
}

export function wrapone(
    f: (...args: any[]) => void,
    with_inp: boolean = false,
): HashpipeFunction {
    return (inp: any, args: any[], ctx: any, cb: Callback) => {
        if (with_inp) {
            args.unshift(inp)
        }
        f(...args, cb)
    }
}

export function wraponeSync(
    f: (...args: any[]) => any,
    with_inp: boolean = false,
): HashpipeFunction {
    return (inp: any, args: any[], ctx: any, cb: Callback) => {
        if (with_inp) {
            args.unshift(inp)
        }
        cb(null, f(...args))
    }
}

export function wrapall(
    o: Record<string, any>,
    pre: string = "",
    with_inp: boolean = false,
    sync: boolean = false,
): Record<string, HashpipeFunction> {
    const wo: Record<string, HashpipeFunction> = {}
    for (const [k, f] of Object.entries(o)) {
        if (typeof f === "function") {
            const wrapf = sync ? wraponeSync : wrapone
            wo[pre + k] = wrapf(f, with_inp)
        }
    }
    return wo
}
