// Terminal UI for the in-browser hashpipe REPL. The interpreter itself is
// the bundled core (hashpipe.js, global `Hashpipe`); this file only handles
// input, history, and rendering values into the scrollback.

(function () {
    var shell = new Hashpipe.WebShell()
    var terminal = document.getElementById("terminal")
    var scrollback = document.getElementById("scrollback")
    var input = document.getElementById("input")

    // ---- history (persisted like ~/.pipeline_history) ----

    var HISTORY_KEY = "hashpipe_history"
    var history = []
    try {
        history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")
    } catch (e) {}
    var historyIndex = history.length
    var draft = ""

    function saveHistory(line) {
        if (history[history.length - 1] !== line) {
            history.push(line)
            if (history.length > 200) history = history.slice(-200)
            try {
                localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
            } catch (e) {}
        }
        historyIndex = history.length
    }

    // ---- rendering ----

    function span(cls, text) {
        var s = document.createElement("span")
        if (cls) s.className = cls
        s.textContent = text
        return s
    }

    function compactLength(value) {
        try {
            var json = JSON.stringify(value)
            return json == null ? 0 : json.length
        } catch (e) {
            return Infinity
        }
    }

    function renderInto(parent, value, indent) {
        if (value === null || value === undefined) {
            return parent.appendChild(span("nil", String(value)))
        }
        if (Hashpipe.Lambda && value instanceof Hashpipe.Lambda) {
            return parent.appendChild(span("lambda", value.toString()))
        }
        var t = typeof value
        if (t === "string") return parent.appendChild(span("str", "'" + value + "'"))
        if (t === "number") return parent.appendChild(span("num", String(value)))
        if (t === "boolean") return parent.appendChild(span("bool", String(value)))
        if (t === "function") return parent.appendChild(span("lambda", "[function]"))

        var isArr = Array.isArray(value)
        var keys = isArr ? value : Object.keys(value)
        if (!keys.length) return parent.appendChild(span("punct", isArr ? "[]" : "{}"))

        var compact = compactLength(value) <= 68
        var pad = new Array(indent + 2).join("  ")
        parent.appendChild(span("punct", (isArr ? "[" : "{") + (compact ? " " : "")))
        keys.forEach(function (item, i) {
            if (!compact) parent.appendChild(document.createTextNode("\n" + pad))
            if (isArr) {
                renderInto(parent, item, indent + 1)
            } else {
                parent.appendChild(span("key", item + ": "))
                renderInto(parent, value[item], indent + 1)
            }
            if (i < keys.length - 1) parent.appendChild(span("punct", compact ? ", " : ","))
        })
        if (!compact) {
            parent.appendChild(
                document.createTextNode("\n" + new Array(indent + 1).join("  ")),
            )
        }
        parent.appendChild(span("punct", (compact ? " " : "") + (isArr ? "]" : "}")))
    }

    function append(node) {
        scrollback.appendChild(node)
        terminal.scrollTop = terminal.scrollHeight
    }

    function div(cls) {
        var d = document.createElement("div")
        d.className = cls
        return d
    }

    // ---- execution ----

    function run(script) {
        var entry = div("entry")
        var cmdline = div("cmdline")
        cmdline.appendChild(span("prompt", "#|"))
        cmdline.appendChild(span("cmd", script))
        entry.appendChild(cmdline)
        append(entry)

        input.disabled = true
        shell.exec(script, function (err, data) {
            if (err != null) {
                var errLine = div("error")
                errLine.textContent = "[ERROR] " + err
                entry.appendChild(errLine)
            } else if (data != null) {
                var out = div("output")
                renderInto(out, data, 0)
                entry.appendChild(out)
            }
            input.disabled = false
            input.focus()
            terminal.scrollTop = terminal.scrollHeight
        })
    }

    function submit() {
        var script = input.value.trim()
        input.value = ""
        // An empty line shows the last output, like the node repl
        if (!script.length) script = "id"
        else saveHistory(script)
        run(script)
    }

    // ---- input handling ----

    input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            submit()
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            if (historyIndex > 0) {
                if (historyIndex === history.length) draft = input.value
                historyIndex--
                input.value = history[historyIndex]
            }
        } else if (e.key === "ArrowDown") {
            e.preventDefault()
            if (historyIndex < history.length) {
                historyIndex++
                input.value =
                    historyIndex === history.length ? draft : history[historyIndex]
            }
        }
    })

    // Backstop: never leave the input disabled if an error escapes a command
    window.addEventListener("error", function () {
        input.disabled = false
        input.focus()
    })

    terminal.addEventListener("click", function () {
        if (!window.getSelection().toString()) input.focus()
    })

    document.querySelectorAll(".example").forEach(function (example) {
        example.addEventListener("click", function () {
            input.value = ""
            saveHistory(example.textContent)
            run(example.textContent)
        })
    })

    // ---- welcome ----

    var banner = div("banner")
    banner.textContent =
        "hashpipe browser repl — the http module is preloaded (get, post, " +
        "put, delete via fetch). Up/down arrows recall history."
    append(banner)
})()
