import { Pipeline, Scope } from "../pipeline";
import { Lambda } from "../helpers";
import { HelpPage } from "../builtins/help";
export declare class WebShell {
    pipeline: Pipeline;
    context: Scope;
    last_out: any;
    constructor();
    exec(script: string): Promise<any>;
}
export { Pipeline, Scope, Lambda, HelpPage };
//# sourceMappingURL=index.d.ts.map