// HTTP Requests

import * as url from "url"
import { HashpipeFunction, Callback } from "../helpers"

type ResponseParser = (res: Response, body: Buffer) => any | Promise<any>

const DEFAULT_USER_AGENT = "Hashpipe HTTP Module"

// Response parsers

function tryParseData(body: Buffer): any {
    if (body.length === 0) {
        return ""
    }
    const stringData = body.toString()
    try {
        return JSON.parse(stringData)
    } catch (_err) {
        return stringData
    }
}

const parseResponseData: ResponseParser = (_res, body) => tryParseData(body)

const parseResponseHeaders: ResponseParser = (res) => {
    const headers: Record<string, string> = {}
    res.headers.forEach((value, key) => {
        headers[key] = value
    })
    return headers
}

const parseResponseAll: ResponseParser = async (res, body) => ({
    data: tryParseData(body),
    headers: parseResponseHeaders(res, body),
})

// Abstract http method using given response parser

// METHOD url {query} {auth, headers}

function fixUrl(u: string): string {
    if (!url.parse(u).protocol) {
        return "http://" + u
    } else {
        return u
    }
}

function applyQuery(targetUrl: string, query: any): string {
    if (!query) {
        return targetUrl
    }
    const parsedUrl = new URL(targetUrl)
    Object.entries(query).forEach(([key, value]) => {
        if (value == null) {
            return
        }
        if (Array.isArray(value)) {
            value.forEach((v) => parsedUrl.searchParams.append(key, String(v)))
        } else {
            parsedUrl.searchParams.set(key, String(value))
        }
    })
    return parsedUrl.toString()
}

function resolveFetch(): typeof fetch {
    if (typeof fetch !== "function") {
        throw new Error("Fetch API is not available in this runtime")
    }
    return fetch
}

function httpMethod(
    method: string,
    responseParser: ResponseParser = parseResponseData,
): HashpipeFunction {
    return async (inp: any, args: any[], ctx: any, cb: Callback) => {
        try {
            const rawUrl = args[0]
            if (typeof rawUrl !== "string" || rawUrl.length === 0) {
                throw new Error("HTTP commands require a target URL")
            }

            const options: Record<string, any> = args[2] || {}
            const headers: Record<string, string> = {
                "user-agent": DEFAULT_USER_AGENT,
                ...(options.headers ?? {}),
            }

            const auth = options.auth
            if (auth?.username && auth?.password) {
                const token = Buffer.from(
                    `${auth.username}:${auth.password}`,
                    "utf8",
                ).toString("base64")
                headers["authorization"] = `Basic ${token}`
            }

            const fetchOptions: Record<string, any> = {
                method,
                headers,
                redirect: options.redirect,
            }

            const targetUrl =
                method === "GET"
                    ? applyQuery(fixUrl(rawUrl), args[1])
                    : fixUrl(rawUrl)

            const methodHasBody = !["GET", "HEAD"].includes(
                method.toUpperCase(),
            )
            if (methodHasBody && inp !== undefined) {
                if (Buffer.isBuffer(inp)) {
                    fetchOptions.body = inp
                } else if (inp instanceof ArrayBuffer) {
                    fetchOptions.body = Buffer.from(inp)
                } else if (ArrayBuffer.isView(inp)) {
                    fetchOptions.body = Buffer.from(inp.buffer)
                } else if (typeof inp === "object") {
                    fetchOptions.body = JSON.stringify(inp)
                    if (!headers["content-type"]) {
                        headers["content-type"] = "application/json"
                    }
                } else {
                    fetchOptions.body = String(inp)
                }
            }

            const fetchImpl = resolveFetch()
            const res = await fetchImpl(targetUrl, fetchOptions)
            const arrayBuffer = await res.arrayBuffer()
            const body = Buffer.from(arrayBuffer)
            const parsed = await responseParser(res, body)

            cb(null, parsed)
        } catch (error) {
            cb(error)
        }
    }
}

// Export relevant methods

export const get = httpMethod("GET")
export const post = httpMethod("POST")
export const put = httpMethod("PUT")
export const patch = httpMethod("PATCH")

export const getv = httpMethod("GET", parseResponseAll)
export const headers = httpMethod("GET", parseResponseHeaders)
export const options = httpMethod("OPTIONS")

// Special export to avoid "delete" keyword
const deleteRequest = httpMethod("DELETE")
export { deleteRequest as delete }
