//@ts-check
import { lstat, mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { getFlags } from "./utils.mjs";

const example = (results = []) => (title, cb) => {
    const resp = cb();
    results.push(resp);
}


const primitive = ["string", "number", "bigint", "boolean", "undefined", "symbol", "null"];

const TS_XOR = `type Prettify<T> = {[K in keyof T]: T[K]} & {};
type Without<T, U> = {[P in Exclude<keyof T, keyof U>]?: never};
type XOR<T, U> = (T | U) extends object ? (Prettify<Without<T, U> & U>) | (Prettify<Without<U, T> & T>): T | U;\n`;

const JS_XOR = `/**
*@template T
*@typedef {{[K in keyof T]: T[K]} & {}} Prettify
**/
/**
*@template T, U
*@typedef {{[P in Exclude<keyof T, keyof U>]?: never}} Without
**/
/**
*@template T, U
*@typedef {(T | U) extends object ? (Prettify<Without<T, U> & U>) | (Prettify<Without<U, T> & T>): T | U} XOR
**/\n`

const typeOf = (obj) => {
    return obj === null ? "null" : typeof obj;
}

const eq = (objA, objB) => {
    if (typeOf(objA) !== typeOf(objB)) return false;
    if (primitive.includes(typeOf(objA))) {
        return objA === objB;
    }
    if (Array.isArray(objA) && Array.isArray(objB)) {
        if (objA.length !== objB.length) return false;
        return objA.reduce((acc, c, i) => {
            return acc && eq(c, objB[i]);
        }, true);
    }
    if (Object.keys(objA).length !== Object.keys(objB).length) return false;
    return Object.keys(objA).reduce((acc, key) => {
        return acc && eq(objA[key], objB[key]);
    }, true);
}

class Or extends Array { };

const jsonReplacer = (k, v) => {
    if (v instanceof Or) {
        return { _$OR: [...v] }
    }
    return v;
}

const jsonParser = (k, v) => {
    if (v["_$OR"]) {
        return new Or(...v["_$OR"]);
    }
    return v;
}

const haveOverlap = (objA, objB) => {
    if (typeOf(objA) !== typeOf(objB)) return false;
    if (primitive.includes(typeOf(objA))) return objA === objB;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);
    return ({
        [keysA.length]: keysA,
        [keysB.length]: keysB,
    }[Math.max(keysA.length, keysB.length)]).reduce((acc, k, i, arr) => {
        const other = arr === keysA ? keysB : keysA;
        return acc || other.includes(k);
    }, false);
}


const combine = (objA, objB) => {
    if (objA instanceof Or || objB instanceof Or) {
        const schema = !(objA instanceof Or) ? [...objB, objA]
            : !(objB instanceof Or) ? [...objA, objB]
                : [...objA, ...objB];
        const reduced = schema.reduce((acc, c, i, arr) => {
            if (arr.slice(0, i).findIndex(e => eq(c, e)) !== -1) {
                return acc;
            }
            const idx = acc.slice(0, i).findIndex(e=>haveOverlap(c,e));
            if(idx !== -1){
                acc[idx] = combine(acc[idx],c)
                return acc;
            }
            return [...acc, c];
        }, []);
        return new Or(...reduced);
    }

    if (typeOf(objA) !== typeOf(objB)) {
        return new Or(objA, objB);
    }

    if (!haveOverlap(objA, objB)) {
        return new Or(objA, objB);
    }

    if (Array.isArray(objA)) {
        return [combine(objA[0], objB[0])];
    }

    if (typeOf(objA) === 'object') {
        return [...new Set([...Object.keys(objA), ...Object.keys(objB)])].reduce((acc, key) => {
            if (!eq(objA[key], objB[key])) {
                let subA = objA[key];
                let subB = objB[key];
                if (subA === undefined) {
                    subA = typeOf(undefined);
                }
                if (subB === undefined) {
                    subB = typeOf(undefined);
                }
                acc[key] = combine(subB, subA);
            } else {
                acc[key] = objA[key];
            }
            return acc;
        }, {});
    }

    return new Or(objA, objB);
}

const fileExists = async (s) => {
    try {
        const resp = await lstat(s);
        return resp.isFile();
    } catch {
        return false;
    }
};

const directoryExist = async (s) => {
    try {
        const resp = await lstat(s);
        return resp.isDirectory();
    } catch {
        return false;
    }
}

const createDir = async (p) => {
    try {
        await mkdir(p);
        return true;
    } catch {
        return false;
    }
}

const toLiteral = (obj)=>{
    if(typeOf(obj) === 'string') return `"${obj}"`;
    return JSON.stringify(obj);
}
const schemaFromObject = (obj, literals = {}) => {
    if(literals === true){
        return toLiteral(obj);
    }
    if (primitive.includes(typeOf(obj))) {
        
        return typeOf(obj);
    }
    if (Array.isArray(obj)) {
        const schema = obj.map((e) => {
            return schemaFromObject(e)
        });

        const reduced = schema.reduce((acc, c, i, arr) => {
            if (i === 0) {
                return c;
            }
            return combine(acc, c);
        });
        return [reduced];
    }

    return Object.keys(obj).reduce((acc, key) => {
        acc[key] = schemaFromObject(obj[key], literals[key]);
        return acc;
    }, {});
}

const schemaTypeToTypescript = (st, params = {}) => {
    if (st instanceof Or) {
        let ors;
        if (params.useXOR) {
            ors = st
                .map(e => schemaTypeToTypescript(e, params))
                .reduce((acc, c, i) => {
                    if (i === 0) return c;
                    return `XOR<${acc},${c}>`
                })
        } else {
            ors = st.map(e => schemaTypeToTypescript(e, params)).join("|");
        }

        return `(${ors})`;
    }
    if (primitive.includes(typeOf(st))) {
        return st;
    }
    if (Array.isArray(st)) {
        return `${schemaTypeToTypescript(st[0], params)}[]`
    }
    if (typeOf(st) === "object") {
        return `{${Object.keys(st).map(k => `${k}:${schemaTypeToTypescript(st[k], params)}`).join(`,`)}}`
    }
}

const schemaTypeToJsDoc = (st, params = {}) => {
    if (st instanceof Or) {
        let ors;
        if (params.useXOR) {
            ors = st
                .map(e => schemaTypeToTypescript(e, params))
                .reduce((acc, c, i) => {
                    if (i === 0) return c;
                    return `XOR<${acc},${c}>`
                })
        } else {
            ors = st.map(e => schemaTypeToTypescript(e, params)).join("|");
        }

        return ors;
    }
    if (primitive.includes(typeOf(st))) {
        return st;
    }
    if (Array.isArray(st)) {
        return `${schemaTypeToTypescript(st[0], params)}[]`
    }
    if (typeOf(st) === "object") {
        return `{${Object.keys(st).map(k => `${k}:${schemaTypeToTypescript(st[k], params)}`).join(`,`)}}`
    }
}

const generateTypescriptFile = async (name, schemaType, params) => {
    const outFile = join(params.outDir, `${name}.ts`);
    let useXOR = '';
    if (params.useXOR) {
        useXOR = TS_XOR;
    }
    const typescriptContent = schemaTypeToTypescript(schemaType, params);
    await writeFile(outFile, `${useXOR}export type ${name} = ${typescriptContent};`);
}

const generateJsDocFile = async (name, schemaType, params) => {
    const outFile = join(params.outDir, `${name}.js`);

    let useXOR = '';
    if (params.useXOR) {
        useXOR = JS_XOR;
    }
    const typescriptContent = schemaTypeToJsDoc(schemaType, params);
    await writeFile(outFile, `${useXOR}/**\n*@typedef {${typescriptContent}}${name}\n**/`);
}


/**
 * @template T
 * @param {T} fn
 * @returns {T}
 */
const prettyErrors = (fn) => {
    //@ts-ignore
    return async (...args) => {
        try {
            //@ts-ignore
            await fn(...args)
        } catch (e) {
            console.error(e.message);
            process.exit(1);
        }
    }

}

const combineParams = (params) => {
    return params.reduce((acc, c) => {
        return {
            ...acc,
            ...c
        }
    }, {});
}

const DEFAULT_PARAMS = {
    useXOR: false,
    snapshot: true,
    throwOnTypeChange: true,
    jsDoc:false,
    snapshotsDir:"snapshots",
    outDir:"types",
    literals:{},
}

/**
 * 
 * @param {string} name Type name used for the file and the type
 * @param {(example:(descripion:string, exec:()=>any)=>void)=>void} cb 
 * @param {typeof DEFAULT_PARAMS} params 
 */
const lazy = async (name, cb, params) => {
    const cwd = process.cwd();
    let RC_PARAMS = {};
    let confFile = await fileExists(join(cwd, "layj.config.js")) ? 
    join(cwd, "layj.config.js") : await fileExists(join(cwd, "layj.config.mjs")) ? 
    join(cwd, "layj.config.mjs") : false;
    const flags = getFlags(2);
    confFile = flags['--conf'] !== undefined ? flags['--conf'] : confFile;
    if(confFile){
        RC_PARAMS = (await import(confFile)).default || {};
    }
    
    const ARG_PARAMS = {
        ...( flags['--useXOR'] !== undefined ? {useXOR: true} : {}),
        ...( flags['--noSnapshots'] !== undefined ? {snapshots: false} : {}),
        ...( flags['--f'] !== undefined ? {throwOnTypeChange: false} : {}),
        ...( flags['--jsDoc'] !== undefined ? {jsDoc: true} : {}),
        ...( flags['--outDir'] !== undefined ? {outDir: flags['--outDir']} : {}),
        ...( flags['--snapshotsDir'] !== undefined ? {snapshotsDir: flags['--snapshotsDir']} : {}),
    };
    params = combineParams([
        DEFAULT_PARAMS,
        RC_PARAMS,
        ARG_PARAMS,
        params,
    ])
    const results = [];
    cb(example(results));
    const awaited = (await Promise.all(results)).map(e => schemaFromObject(e, params.literals));
    const schemaType = awaited.reduce((acc, c, i) => {
        if (i === 0) return c;
        return combine(acc, c);
    });

    if (params.snapshot) {
        const outDir = params.snapshotsDir || params.outDir || join(cwd, "/snapshots/");
        const snapshotName = join(outDir, `${name}.snapshot`);
        if (!await directoryExist(outDir)) {
            if (!(await createDir(outDir))) {
                throw new Error(`Unable to create directory ${outDir}`);
            }
        }
        if (await fileExists(snapshotName) && params.throwOnTypeChange) {
            const snapshot = JSON.parse(await readFile(snapshotName, { encoding: "utf-8" }), jsonParser);
            if (!eq(schemaType, snapshot)) {
                throw new Error(`New type doesn't match snapshot for type ${name}`);
            }
        }
        await writeFile(snapshotName, JSON.stringify(schemaType, jsonReplacer, 4));
    }
    const outDir = params.outDir = params.outDir || join(process.cwd(), "/types/");
    if (!await directoryExist(outDir)) {
        if (!(await createDir(outDir))) {
            throw new Error(`Unable to create directory ${outDir}`);
        }
    }
    if (params.jsDoc) {
        await generateJsDocFile(name, schemaType, params);
    } else {
        await generateTypescriptFile(name, schemaType, params);
    }
};

export const layj = prettyErrors(lazy);





