"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneObject = void 0;
const clone = require("clone");
/**
 * Deep clones a object in the most easiest manner.
 */
function cloneObject(obj) {
    return clone(obj);
}
exports.cloneObject = cloneObject;
