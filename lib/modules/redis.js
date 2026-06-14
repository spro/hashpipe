"use strict";
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
exports.connect = connect;
const redis = __importStar(require("redis"));
const helpers_1 = require("../helpers");
function connect(config) {
    const redis_client = redis.createClient({
        socket: {
            port: config?.port || 6379,
            host: config?.host || "localhost",
        },
    });
    redis_client.connect();
    const fns = {
        redis: (0, helpers_1.command)((inp, args) => {
            const method = args[0];
            const methodArgs = args.slice(1);
            return new Promise((resolve, reject) => {
                const result = redis_client[method](...methodArgs, (err, ret) => {
                    if (err)
                        reject(err);
                    else
                        resolve(ret);
                });
                if ((0, helpers_1.isPromiseLike)(result)) {
                    result.then(resolve, reject);
                }
            });
        }),
    };
    return fns;
}
//# sourceMappingURL=redis.js.map