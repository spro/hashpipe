import { Pipeline, Scope } from "../pipeline";
import { Lambda } from "../helpers";
import { HelpPage } from "../builtins/help";
import type { Callback } from "../helpers";
export declare class WebShell {
    pipeline: Pipeline;
    context: Scope;
    last_out: any;
    constructor();
    exec(script: string, cb: Callback): void;
}
export { Pipeline, Scope, Lambda, HelpPage };
//# sourceMappingURL=index.d.ts.map