"use strict";
// HTTP Requests
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.http_delete = exports.http_options = exports.http_head = exports.patch = exports.put = exports.post = exports.get_all = exports.get_headers = exports.get = void 0;
const url = __importStar(require("url"));
const DEFAULT_USER_AGENT = "Hashpipe HTTP Module";
// Response parsers
function tryParseData(body) {
    if (body.length === 0) {
        return "";
    }
    const stringData = body.toString();
    try {
        return JSON.parse(stringData);
    }
    catch (_err) {
        return stringData;
    }
}
const parseResponseData = (_res, body) => tryParseData(body);
const parseResponseHeaders = (res) => {
    const headers = {};
    res.headers.forEach((value, key) => {
        headers[key] = value;
    });
    return headers;
};
const parseResponseAll = async (res, body) => ({
    data: tryParseData(body),
    headers: parseResponseHeaders(res, body),
});
// Abstract http method using given response parser
// METHOD url {query} {auth, headers}
function fixUrl(u) {
    if (!url.parse(u).protocol) {
        return "http://" + u;
    }
    else {
        return u;
    }
}
function applyQuery(targetUrl, query) {
    if (!query) {
        return targetUrl;
    }
    const parsedUrl = new URL(targetUrl);
    Object.entries(query).forEach(([key, value]) => {
        if (value == null) {
            return;
        }
        if (Array.isArray(value)) {
            value.forEach((v) => parsedUrl.searchParams.append(key, String(v)));
        }
        else {
            parsedUrl.searchParams.set(key, String(value));
        }
    });
    return parsedUrl.toString();
}
function resolveFetch() {
    if (typeof fetch !== "function") {
        throw new Error("Fetch API is not available in this runtime");
    }
    return fetch;
}
function httpMethod(method, responseParser = parseResponseData) {
    return async (inp, args, ctx, cb) => {
        try {
            const rawUrl = args[0];
            if (typeof rawUrl !== "string" || rawUrl.length === 0) {
                throw new Error("HTTP commands require a target URL");
            }
            const options = args[2] || {};
            const headers = {
                "user-agent": DEFAULT_USER_AGENT,
                ...(options.headers ?? {}),
            };
            const auth = options.auth;
            if (auth?.username && auth?.password) {
                const token = Buffer.from(`${auth.username}:${auth.password}`, "utf8").toString("base64");
                headers["authorization"] = `Basic ${token}`;
            }
            const fetchOptions = {
                method,
                headers,
                redirect: options.redirect,
            };
            const targetUrl = method === "GET"
                ? applyQuery(fixUrl(rawUrl), args[1])
                : fixUrl(rawUrl);
            const methodHasBody = !["GET", "HEAD"].includes(method.toUpperCase());
            if (methodHasBody && inp !== undefined) {
                if (Buffer.isBuffer(inp)) {
                    fetchOptions.body = inp;
                }
                else if (inp instanceof ArrayBuffer) {
                    fetchOptions.body = Buffer.from(inp);
                }
                else if (ArrayBuffer.isView(inp)) {
                    fetchOptions.body = Buffer.from(inp.buffer);
                }
                else if (typeof inp === "object") {
                    fetchOptions.body = JSON.stringify(inp);
                    if (!headers["content-type"]) {
                        headers["content-type"] = "application/json";
                    }
                }
                else {
                    fetchOptions.body = String(inp);
                }
            }
            const fetchImpl = resolveFetch();
            const res = await fetchImpl(targetUrl, fetchOptions);
            const arrayBuffer = await res.arrayBuffer();
            const body = Buffer.from(arrayBuffer);
            const parsed = await responseParser(res, body);
            cb(null, parsed);
        }
        catch (error) {
            cb(error);
        }
    };
}
// get "url" -> {data} / "html"
exports.get = httpMethod("GET");
exports.get_headers = httpMethod("GET", parseResponseHeaders);
exports.get_all = httpMethod("GET", parseResponseAll);
// {data} -> post "url" -> {data} / "html"
exports.post = httpMethod("POST");
// {data} -> post "url" -> {data} / "html"
exports.put = httpMethod("PUT");
exports.patch = httpMethod("PATCH");
exports.http_head = httpMethod("HEAD", parseResponseHeaders);
exports.http_options = httpMethod("OPTIONS");
exports.http_delete = httpMethod("DELETE");
//# sourceMappingURL=http.js.map