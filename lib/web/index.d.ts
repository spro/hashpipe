import { Pipeline, Scope } from "../pipeline";
import { Lambda } from "../helpers";
import type { Callback } from "../helpers";
export declare class WebShell {
    pipeline: Pipeline;
    context: Scope;
    last_out: any;
    constructor();
    exec(script: string, cb: Callback): void;
}
export { Pipeline, Scope, Lambda };
//# sourceMappingURL=index.d.ts.map