import { HashpipeFunction } from "../helpers";
type ResponseParser = (res: Response, body: Buffer) => any | Promise<any>;
declare function httpMethod(method: string, responseParser?: ResponseParser): HashpipeFunction;
export declare const get: HashpipeFunction;
export declare const get_headers: HashpipeFunction;
export declare const get_all: HashpipeFunction;
export declare const post: HashpipeFunction;
export declare const put: HashpipeFunction;
export { httpMethod as delete };
//# sourceMappingURL=http.d.ts.map