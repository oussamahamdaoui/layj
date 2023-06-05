#!/usr/bin/env node
//@ts-check

import { exec } from "child_process";
import fs from "fs";
import { join } from "path";
import readline from "readline";
import { getFlags, walkDir, color, colors } from "./utils.mjs";


const cwd = process.cwd();

const validCommands = [
    "help", "h",
    "g", "generate",
    "w", "watch",
];

const printHelp = ()=>{
    console.log(`Usage: ${color(colors.FgYellow)("layj")} [${color(colors.FgCyan)("options")}] [${color(colors.FgMagenta)("flags")}]
    ${color(colors.FgCyan)("Options")}:
        h, help           Prints usage
        w, watch          Watches the curent directory for changes to
                          files ending with .layj.js and generates the types
        g, generate       Generates types from all files ending with .layj.js
    ${color(colors.FgMagenta)("Flags")}:
        --f               Ignores the errors and regenerates the snapshots
        --outDir          Overwires the default directory used to store the types
        --snapshotsDir    Overwires the default directory used to store the snapshots
        --useXOR          Uses XOR instead of OR to combine the types
        --jsDoc           Generates JSDoc types instead of typescript
        --noSnapshots     Skips the generation of snapshots
        --conf            Changes the conf file (defaults to lay.config.mjs)
    `)
}

const command = process.argv[2] || "g";
if(!validCommands.includes(command)){
    console.log(`${color(colors.FgYellow)("[layj]")}: ${color(colors.FgRed)(`Unnkown command ${command}`)}`)
    printHelp();
    process.exit(1);
}
const flags = getFlags(3);
const flagsObjToStr = (f)=>{
    return Object.entries(f).reduce((acc, c)=>{
        if(c[1] !== ""){
            return acc + `${c[0]} ${c[1]} `;
        }
        return acc + `${c[0]} `

    }, "")
}


if (["help", "h"].includes(command)) {
    printHelp();
} else if (["g", "generate"].includes(command)) {
    await walkDir(cwd, (filename) => {
        if ((filename.endsWith(".layj.js") || filename.endsWith(".layj.mjs"))) {
            console.log(`${color(colors.FgYellow)("[layj]")}: Regenerating types for ${color(colors.FgCyan)(filename)}`);
            exec(`node ${filename}`, { cwd }, (err, stdout, stderr) => {
                if (stderr) {
                    stderr.split('\n').filter(e => e).forEach(e => {
                        console.log(`${color(colors.FgYellow)("[layj]")}: ${color(colors.FgRed)(e)}`)
                    })
                }
            });
        }
    });
} else if (["w", "watch"].includes(command)) {
    const logInitMessage = () => {
        console.clear();
        console.log(`${color(colors.FgYellow)("[layj]")}: watching folder ${color(colors.FgCyan)(cwd)}`);
        console.log(`${color(colors.FgYellow)("[layj]")}: You can press ${color(colors.FgYellow)("r")} to regenerate snapshots`);
        console.log(`${color(colors.FgYellow)("[layj]")}: You can press ${color(colors.FgYellow)("q")} to stop the process`);
    }
    logInitMessage();
    let ignore = false;
    const strFlags = flagsObjToStr(flags);
    fs.watch(cwd, { recursive: true }, function (event, filename) {
        if ((filename.endsWith(".layj.js") || filename.endsWith(".layj.mjs")) && !ignore) {
            logInitMessage();
            console.log(`${color(colors.FgYellow)("[layj]")}: Regenerating types for ${color(colors.FgCyan)(join(cwd, filename))}`);
            exec(`node ${filename} ${strFlags}`, { cwd }, (err, stdout, stderr) => {
                if (stderr) {
                    stderr.split('\n').filter(e => e).forEach(e => {
                        console.log(`${color(colors.FgYellow)("[layj]")}: ${color(colors.FgRed)(e)}`)
                    })
                }
            });

        }
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    //@ts-ignore
    rl.input.on('keypress', async (key) => {
        if (key === 'q') {
            console.clear();
            process.exit();
        }
        if (key === 'r') {
            ignore = true;
            logInitMessage();
            const strFlags = flagsObjToStr({
                ...flags,
                '--f':true,
            });
            await walkDir(cwd, (filename) => {
                if ((filename.endsWith(".layj.js") || filename.endsWith(".layj.mjs"))) {
                    console.log(`${color(colors.FgYellow)("[layj]")}: Regenerating types for ${color(colors.FgCyan)(filename)}`);
                    exec(`node ${filename} ${strFlags}`, { cwd }, (err, stdout, stderr) => {
                        if (stderr) {
                            stderr.split('\n').filter(e => e).forEach(e => {
                                console.log(`${color(colors.FgYellow)("[layj]")}: ${color(colors.FgRed)(e)}`)
                            })
                        }
                    });
                }
            });
            ignore = false;
        }
        logInitMessage();
    });

    rl.on('close', () => {
        process.exit()
    });
    // rl.prompt();


}


