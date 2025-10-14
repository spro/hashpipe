import { beforeAll, afterAll, describe, expect, test } from "vitest"
import { createServer } from "http"
import type { IncomingMessage, ServerResponse } from "http"
import * as httpModule from "../src/modules/http"
import { execPipeline, runHashpipeFn } from "./helpers"
import { Pipeline } from "../lib/pipeline"

function bufferBody(req: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []
        req.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
        req.on("end", () => resolve(Buffer.concat(chunks)))
        req.on("error", reject)
    })
}

describe("http module", () => {
    const pipe = new Pipeline().use("http")

    const execScript = (script: string, input?: any): Promise<any> =>
        execPipeline(pipe, script, { input })

    let server: ReturnType<typeof createServer>
    let baseUrl: string

    beforeAll(async () => {
        server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
            const { method, url } = req
            if (!url) {
                res.statusCode = 400
                res.end("missing url")
                return
            }

            if (method === "GET" && url.startsWith("/json")) {
                const responseBody = { hello: "world", url }
                res.setHeader("Content-Type", "application/json")
                res.setHeader("X-Test-Header", "hashpipe")
                res.end(JSON.stringify(responseBody))
                return
            }

            if (method === "POST" && url === "/echo") {
                const bodyBuffer = await bufferBody(req)
                const bodyString = bodyBuffer.toString() || "{}"
                res.setHeader("Content-Type", "application/json")
                res.end(JSON.stringify({
                    received: bodyString,
                    contentType: req.headers["content-type"],
                }))
                return
            }

            if (method === "PUT" && url === "/payload") {
                const bodyBuffer = await bufferBody(req)
                res.setHeader("Content-Type", "application/json")
                res.end(bodyBuffer)
                return
            }

            if (method === "PATCH" && url === "/mutate") {
                const bodyBuffer = await bufferBody(req)
                const parsed = JSON.parse(bodyBuffer.toString() || "{}")
                res.setHeader("Content-Type", "application/json")
                res.end(JSON.stringify({
                    ...parsed,
                    patched: true,
                }))
                return
            }

            if (method === "DELETE" && url === "/resource/123") {
                res.statusCode = 204
                res.setHeader("X-Deleted", "true")
                res.end()
                return
            }

            if (method === "HEAD" && url === "/json") {
                res.setHeader("X-Test-Header", "hashpipe")
                res.statusCode = 200
                res.end()
                return
            }

            if (method === "OPTIONS" && url === "/json") {
                res.setHeader("Allow", "GET,HEAD,POST,OPTIONS")
                res.setHeader("Content-Type", "application/json")
                res.end(JSON.stringify({ allow: ["GET", "HEAD", "POST", "OPTIONS"] }))
                return
            }

            res.statusCode = 404
            res.end("not found")
        })

        await new Promise<void>((resolve, reject) => {
            server.once("error", reject)
            server.listen({ port: 0, host: "127.0.0.1" }, () => {
                server.off("error", reject)
                resolve()
            })
        })
        const address = server.address()
        if (typeof address === "object" && address?.port) {
            baseUrl = `http://127.0.0.1:${address.port}`
        } else {
            throw new Error("Failed to determine test server address")
        }
    })

    afterAll(async () => {
        if (server.listening) {
            await new Promise<void>((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()))
            })
        }
    })

    test("pipeline GET merges query params", async () => {
        const result = await execScript(
            `get "${baseUrl}/json" $( obj filter yes )`,
        )
        expect(result).toEqual({ hello: "world", url: "/json?filter=yes" })
    })

    test("pipeline get_headers returns response headers", async () => {
        const headers = await execScript(`get_headers "${baseUrl}/json"`)
        expect(headers).toMatchObject({ "x-test-header": "hashpipe" })
    })

    test("pipeline get_all returns data and headers", async () => {
        const response = await execScript(`get_all "${baseUrl}/json"`)
        expect(response.data).toEqual({ hello: "world", url: "/json" })
        expect(response.headers["content-type"]).toContain("application/json")
    })

    test("pipeline POST sends upstream JSON", async () => {
        const result = await execScript(
            `obj message hi | post "${baseUrl}/echo"`,
        )
        expect(result).toEqual({
            received: JSON.stringify({ message: "hi" }),
            contentType: "application/json",
        })
    })

    test("pipeline PUT passes through string payloads", async () => {
        const result = await execScript(
            `echo "raw text" | put "${baseUrl}/payload"`,
        )
        expect(result).toEqual("raw text")
    })

    test("pipeline PATCH merges JSON bodies", async () => {
        const result = await execScript(
            `obj flag $( true ) | patch "${baseUrl}/mutate"`,
        )
        expect(result).toEqual({ flag: true, patched: true })
    })

    test("pipeline HEAD exposes headers", async () => {
        const headers = await execScript(`http_head "${baseUrl}/json"`)
        expect(headers).toMatchObject({ "x-test-header": "hashpipe" })
    })

    test("pipeline OPTIONS parses JSON body", async () => {
        const response = await execScript(`http_options "${baseUrl}/json"`)
        expect(response).toEqual({ allow: ["GET", "HEAD", "POST", "OPTIONS"] })
    })

    test("pipeline DELETE commands return no-content", async () => {
        const deleteResult = await execScript(
            `http_delete "${baseUrl}/resource/123"`,
        )
        expect(deleteResult).toEqual("")

        const delResult = await execScript(`http_delete "${baseUrl}/resource/123"`)
        expect(delResult).toEqual("")
    })

    test("direct get helper still works", async () => {
        const result = await runHashpipeFn(httpModule.get, undefined, [`${baseUrl}/json`])
        expect(result).toEqual({ hello: "world", url: "/json" })
    })
})
