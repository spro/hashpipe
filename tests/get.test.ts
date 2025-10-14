import { test, expect } from "vitest"
import { get } from "../src/modules/http"

test("gets something", async () => {
    const response = (await new Promise((done) => {
        get(
            undefined,
            ["https://hacker-news.firebaseio.com/v0/item/9050970.json"],
            {},
            (err, response) => {
                done(response)
            },
        )
    })) as any

    expect(response.id).toBe(9050970)
    expect(response.by).toBe("joewalnes")
})
