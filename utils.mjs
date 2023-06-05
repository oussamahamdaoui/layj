//@ts-check
import { readdir, stat } from "fs/promises";
import { join } from "path";

export const colors = {
    FgBlack: "\x1b[30m",
    FgRed: "\x1b[31m",
    FgGreen: "\x1b[32m",
    FgYellow: "\x1b[33m",
    FgBlue: "\x1b[34m",
    FgMagenta: "\x1b[35m",
    FgCyan: "\x1b[36m",
    FgWhite: "\x1b[37m",
    FgGray: "\x1b[90m",

    BgBlack: "\x1b[40m",
    BgRed: "\x1b[41m",
    BgGreen: "\x1b[42m",
    BgYellow: "\x1b[43m",
    BgBlue: "\x1b[44m",
    BgMagenta: "\x1b[45m",
    BgCyan: "\x1b[46m",
    BgWhite: "\x1b[47m",
    BgGray: "\x1b[100m",
}

export const color = (color) => (str) => {
    return `${color}${str}\x1b[0m`
}

/**
 * 
 * @param {number} idx 
 * @returns {Partial<Record<"--outDir"|"--snapshotsDir"|"--conf"|"--f"|"--useXOR"|"--jsDoc"|"--noSnapshots", string>>}
 */

export const getFlags = (idx = 3)=>{
    const flagsArgs = {
        "--outDir":1,
        "--snapshotsDir":1,
        "--conf":1,
        "--f":0,
        "--useXOR":0,
        "--jsDoc":0,
        "--noSnapshots":0,
    }
    return process.argv.slice(idx).reduce((acc, c, i, arr)=>{
        if(flagsArgs[c] !== undefined){
            acc[c] = arr.slice(i+1, i+flagsArgs[c]+1).join(" ");
            if(flagsArgs[c] !== 0 && acc[c] === ''){
                console.log(`${color(colors.FgYellow)("[layj]")}: ${color(colors.FgRed)(`Flag ${c} expected argument`)}`);
                process.exit(1);
            }
        }
        return acc;
    }, {});
}

export const isDirectory = async (p) => (await stat(p)).isDirectory();

export const walkDir = async (path, cb) => {
    const files = await readdir(path);
    Promise.all(files.map(async f => {
        if (await isDirectory(join(path, f))) {
            await walkDir(join(path, f), cb);
        } else {
            cb(join(path, f));
        }
    }));
}