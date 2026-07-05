// Terminal UI for the in-browser hashpipe REPL. The interpreter itself is
// the bundled core (hashpipe.js, global `Hashpipe`); this file only handles
// input, history, and rendering values into the scrollback.

(function () {
    var shell = new Hashpipe.WebShell()
    var terminal = document.getElementById("terminal")
    var scrollback = document.getElementById("scrollback")
    var inputLine = document.getElementById("input-line")
    var input = document.getElementById("input")

    // ---- mobile viewport / keyboard handling ----

    var initialViewportHeight =
        window.visualViewport && window.visualViewport.height
            ? window.visualViewport.height
            : window.innerHeight

    function scrollToPrompt() {
        // Scroll immediately and again on the next frame: the sync scroll
        // guarantees new entries are never appended out of view, the raf
        // pass catches late layout (fonts, keyboard, async output).
        // scrollIntoView must run BEFORE the scrollTop clamp: the input line
        // is sticky, so scrollIntoView aligns to its stuck rect and stops
        // padding-bottom short of the true bottom — leaving the last line of
        // output hidden underneath the opaque input line
        terminal.scrollTop = terminal.scrollHeight
        window.requestAnimationFrame(function () {
            if (inputLine.scrollIntoView) inputLine.scrollIntoView({ block: "end" })
            terminal.scrollTop = terminal.scrollHeight
        })
    }

    function syncViewport() {
        var viewport = window.visualViewport
        var height = viewport && viewport.height ? viewport.height : window.innerHeight
        document.documentElement.style.setProperty("--app-height", height + "px")

        var keyboardLikelyOpen =
            document.activeElement === input && height < initialViewportHeight - 90
        document.body.classList.toggle("keyboard-open", keyboardLikelyOpen)
        if (document.activeElement === input) scrollToPrompt()
    }

    syncViewport()
    window.addEventListener("resize", syncViewport)
    window.addEventListener("orientationchange", function () {
        initialViewportHeight = window.innerHeight
        setTimeout(syncViewport, 250)
    })
    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", syncViewport)
        window.visualViewport.addEventListener("scroll", syncViewport)
    }

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

    // The help command returns a structured page; render its examples as
    // clickable chips so they can be tried in place
    function renderHelp(parent, page) {
        var help = div("help")
        page.sections.forEach(function (section) {
            var title = div("help-title")
            title.textContent = section.title
            help.appendChild(title)
            ;(section.lines || []).forEach(function (line) {
                var l = div("help-line")
                l.textContent = line
                help.appendChild(l)
            })
            ;(section.examples || []).forEach(function (ex) {
                var row = div("help-example")
                var chip = document.createElement("code")
                chip.className = "example"
                chip.textContent = ex.cmd
                chip.addEventListener("click", function () {
                    saveHistory(ex.cmd)
                    run(ex.cmd)
                })
                row.appendChild(chip)
                row.appendChild(span("help-note", ex.note))
                help.appendChild(row)
            })
        })
        var docs = div("help-docs")
        var link = document.createElement("a")
        link.href = page.docs
        link.target = "_blank"
        link.textContent = "full syntax guide →"
        docs.appendChild(link)
        help.appendChild(docs)
        parent.appendChild(help)
    }

    function append(node) {
        scrollback.appendChild(node)
        scrollToPrompt()
    }

    function div(cls) {
        var d = document.createElement("div")
        d.className = cls
        return d
    }

    // ---- execution ----

    var SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

    // Commands render their entry the moment they are submitted and run
    // in order off a queue — the input never disables, so typing during a
    // slow command can't drop keystrokes, and every entry is visible
    // immediately even while earlier commands are still working
    var queue = []
    var busy = false

    function run(script) {
        var entry = div("entry")
        var cmdline = div("cmdline")
        cmdline.appendChild(span("prompt", "#|"))
        cmdline.appendChild(span("cmd", script))
        entry.appendChild(cmdline)

        var pending = div("pending")
        pending.textContent = SPINNER_FRAMES[0]
        entry.appendChild(pending)

        append(entry)
        queue.push({ script: script, entry: entry, pending: pending })
        drain()
    }

    function drain() {
        if (busy || !queue.length) return
        busy = true
        var job = queue.shift()
        var frame = 0
        var spinner = setInterval(function () {
            frame = (frame + 1) % SPINNER_FRAMES.length
            job.pending.textContent = SPINNER_FRAMES[frame]
        }, 80)

        function finish() {
            clearInterval(spinner)
            job.entry.removeChild(job.pending)
            scrollToPrompt()
            busy = false
            drain()
        }
        // `examples` is a repl-level command: the curated list lives here,
        // not in the interpreter, but it renders like any other entry
        if (job.script.trim() === "examples") {
            renderExamples(job.entry)
            finish()
            return
        }
        shell.exec(job.script).then(
            function (data) {
                if (Hashpipe.HelpPage && data instanceof Hashpipe.HelpPage) {
                    renderHelp(job.entry, data)
                } else if (data != null) {
                    var out = div("output")
                    renderInto(out, data, 0)
                    job.entry.appendChild(out)
                }
                finish()
            },
            function (err) {
                var errLine = div("error")
                // Structured errors (e.g. http status objects) render as
                // values so their fields are readable
                if (err != null && typeof err === "object" && !(err instanceof Error)) {
                    errLine.appendChild(span(null, "[ERROR] "))
                    renderInto(errLine, err, 0)
                } else {
                    errLine.textContent = "[ERROR] " + err
                }
                job.entry.appendChild(errLine)
                finish()
            },
        )
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

    input.addEventListener("focus", syncViewport)
    input.addEventListener("blur", function () {
        document.body.classList.remove("keyboard-open")
        setTimeout(syncViewport, 0)
    })

    // Backstop: never leave the queue stuck if an error escapes a command
    window.addEventListener("error", function () {
        busy = false
        drain()
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

    // ---- examples panel ----

    // Curated examples, grouped; every command verified against the
    // interpreter (see docs/syntax-probes.html for the probe runs)
    var EXAMPLES = [
        {
            title: "reshaping json",
            items: [
                {
                    cmd: '{id: 7, title: "Hello", by: "sam", score: 42} @ {title, author: by}',
                    note: "pick and rename fields with an @ template",
                },
                {
                    cmd: '$city = "Osaka" ; {name: "Fred", age: 42} @ {name, from: $city}',
                    note: "splice variables straight into templates",
                },
                {
                    cmd: "range 10 @ 2..5",
                    note: "slices are end-exclusive; negatives count from the end",
                },
                {
                    cmd: '["alpha", "beta", "gamma"] || upper @ 0..2',
                    note: "a suffix applies within its || section — here, each string",
                },
            ],
        },
        {
            title: "live apis",
            items: [
                {
                    cmd: '$hn = "https://hacker-news.firebaseio.com/v0" ; get $hn/topstories.json @ 0..5 || get $hn/item/$!.json @ {title, score}',
                    note: "hacker news front page: five fetches in parallel",
                },
                {
                    cmd: '["pikachu", "snorlax"] || get pokeapi.co/api/v2/pokemon/$! @ {name, weight}',
                    note: "$! is the current item inside a || section",
                },
                {
                    cmd: 'def crawl { $url | $page = get $url ; if $($page @ next) {| crawl $($page @ next) } {| $page @ results:name } } ; crawl "https://pokeapi.co/api/v2/pokemon?limit=500" | length',
                    note: "recursive pagination: follow next links to the last page",
                },
            ],
        },
        {
            title: "functions",
            items: [
                {
                    cmd: "def fact { $n | if $($n <= 1) {| 1 } {| $n * $(fact $($n - 1)) } } ; fact 5",
                    note: "recursion with lazy if branches",
                },
                {
                    cmd: "[1, 2, 3, 4] | reduce { $acc | $acc + $! } 0",
                    note: "reduce with a named accumulator",
                },
                {
                    cmd: '[{name: "sparky", age: 58}, {name: "woofer", age: 6}] | sortBy {| @ age } @ :name',
                    note: "lambdas as sort keys",
                },
            ],
        },
        {
            title: "errors",
            items: [
                {
                    cmd: "get httpbingo.org/status/418 |? @ status",
                    note: "http errors carry their status; |? catches and pipes them",
                },
                {
                    cmd: "[{a: 1}, {a: 2}] @ a",
                    note: "shape mistakes fail loudly and name the fix",
                },
            ],
        },
    ]

    function renderExamples(parent) {
        var panel = div("help")
        EXAMPLES.forEach(function (section) {
            var title = div("help-title")
            title.textContent = section.title
            panel.appendChild(title)
            section.items.forEach(function (ex) {
                var row = div("help-example")
                var chip = document.createElement("code")
                chip.className = "example"
                chip.textContent = ex.cmd
                chip.addEventListener("click", function () {
                    saveHistory(ex.cmd)
                    run(ex.cmd)
                })
                row.appendChild(chip)
                row.appendChild(span("help-note", ex.note))
                panel.appendChild(row)
            })
        })
        parent.appendChild(panel)
    }

    var moreExamples = document.getElementById("more-examples")
    if (moreExamples) {
        moreExamples.addEventListener("click", function (e) {
            e.preventDefault()
            saveHistory("examples")
            run("examples")
        })
    }

    // ---- welcome ----

    var banner = div("banner")
    banner.textContent =
        "hashpipe browser repl — type help or examples to get started. The http module " +
        "is preloaded (get, post, put, delete via fetch); up/down arrows " +
        "recall history."
    append(banner)
})()
