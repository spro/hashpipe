// Keywords and counting

import { HashpipeFunction } from "../helpers"

const stopwords = new RegExp(
    "\\b" +
        "a about above after again against all am an and any are aren't as at be because been before being below between both but by can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further get got had hadn't has hasn't have haven't having he he'd he'll he's her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself let's like me more most mustn't my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some such than that that's the their theirs them themselves then there there's these they they'd they'll they're they've this those through to too under until up very was wasn't we we'd we'll we're we've were weren't what what's when when's where where's which while who who's whom why why's will with won't would wouldn't you you'd you'll you're you've your yours yourself yourselves"
            .split(" ")
            .reverse()
            .join("\\b|\\b") +
        "\\b",
    "g",
)

// "html" -> strip_html -> "text"
function strip_html(s: string): string {
    return s.replace(/<(?:.|\n)*?>/gm, "")
}

export const strip_html_cmd: HashpipeFunction = (inp, args, ctx, cb) => {
    cb(null, strip_html(inp))
}

// "text" -> keywords -> ["keyword"]
export const keywords: HashpipeFunction = (inp, args, ctx, cb) => {
    const keywords_list = strip_html(inp.toLowerCase())
        .replace(stopwords, "")
        .replace(/\s+/, " ")
        .match(/[a-z']{2,}/g)
    cb(null, keywords_list)
}

// "text" -> words -> ["word"]
export const words: HashpipeFunction = (inp, args, ctx, cb) => {
    cb(null, inp.match(/[\w']{2,}/g))
}

// "text" -> slugify -> "slug"
export const slugify: HashpipeFunction = (inp, args, ctx, cb) => {
    cb(
        null,
        inp
            .toLowerCase()
            .replace(/\W+/g, "-")
            .replace(/^\W?(.+)\W$/, "$1"),
    )
}
