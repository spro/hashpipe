import core from "./core"
import math from "./math"
import strings from "./strings"
import collections from "./collections"
import json from "./json"
import debug from "./debug"
import random from "./random"
import time from "./time"
import environment from "./environment"
import help from "./help"
import { BuiltinMap } from "./common"

// Aggregate builtins so existing imports keep working.

const builtins: BuiltinMap = {
    ...core,
    ...math,
    ...strings,
    ...collections,
    ...json,
    ...debug,
    ...random,
    ...time,
    ...environment,
    ...help,
}

export = builtins
