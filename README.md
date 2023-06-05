<h2 align="center">Layj, generate API types the lazy way</h2>

**👩🏻‍💻 Developer Ready**: A comprehensive JavaScript solution to generate types for your projects. Works out of the box for most APIs.

**🏃🏽 Instant Feedback**: Fast, interactive watch mode.

**📸 Snapshot Testing**: Capture snapshots of your API types and be notified if the API responses change

## Table of Contents
 - [Getting Started](#getting-started)
 - [Usage](#usage)
    - [Literals](#literals)
    - [Other Parameters](#other-parameters)
 - [CLI](#cli)
    - [Watch mode](#watch-mode)
 - [Configuration](#configuration)
 - [Contribution](#contribution)

## Getting Started

Install layj using npm

```bash
npm i layj
```

Let's get started by writing the type generators for [themoviedb api](https://developer.themoviedb.org/docs), in a fille named `api.layj.mjs`:

```javascript
import { layj } from "layj";


const get = async (url) => {
    return (await fetch(url)).json();
}

layj('movieType', (example) => {
   const API_KEY = "**API key**";
   example("request movie", async () => {
        return await get(`https://api.themoviedb.org/3/movie/11?api_key=${API_KEY}`);
    });

    example("request movie", async () => {
        return await get(`https://api.themoviedb.org/3/movie/110?api_key=${API_KEY}`);
    });

    example("request movie with video", async () => {
        return await get(`https://api.themoviedb.org/3/movie/157336?api_key=${API_KEY}&append_to_response=videos`);
    });

    example("request movie with video and images", async () => {
        return await get(`https://api.themoviedb.org/3/movie/157336?api_key=${API_KEY}&append_to_response=videos,images`);
    });


    example("request movie no api", async () => {
        return await get(`https://api.themoviedb.org/3/movie/11`);
    });
});
```

if you run this file, layj will generate the `movieType` type in a file `movieType.ts` located in the directory `types` and a file called `movieType.snapshot` in the directory `snapshots`, we will see how you can change this behaviour [later](#configuration).

Under the hood layj made the get requests then generated the types for the return values, at last it combined the types in a single type `movieType` using the `|` union type making sure that `ovarlaping` objects are combined.

## Usage

```javascript
import { layj } from "layj";

layj('UserResponse', (example) => {

    example("name only", async () => {
        return {
            name: "Jhon Doe"
        }
    });
    
    example("name and email address", async () => {
        return {
            name: "Jhon Doe",
            email: "jhon@example.com",
        }
    });

    example("error", async () => {
        return null;
    });
    

    example("user with age", async () => {
        return {
            name: "Jhon Doe",
            email: "jhon@example.com",
            age: 99,
        }
    });

    example("user likes", async () => {
        return {
            name: "Jhon Doe",
            likes: [1, "cats", false],
        }
    });
});
```
Running this file will produce this type:

```typescript
export type UserResponse = {
      name: string,
      email: string | undefined,
      age: number | undefined,
      likes: (number | string | boolean)[] | undefined,
    }
  | null;
```

As you can see layj was able to combine the different responses into a single type.

### Literals
Sometimes you now that a part of your respose is allways the same you would want to use literals instead of a more general type for example:

```javascript
import { layj } from "layj";

layj('literalExample', (example) => {

    example("request 1", async () => {
        return {
            isError:false,
            data:"bla bla",
            dataType:"type 1",
        }
    });
    
    example("request 2", async () => {
        return {
            isError:false,
            data:"bla bla",
            dataType:"type 2",
        }
    });

    example("request 3", async () => {
        return {
            isError:false,
            data:"bla bla",
            dataType:"type 3",
        }
    });
    

    example("request 4", async () => {
        return {
            isError:false,
            data:"bla bla",
            dataType:"type 1",
        }
    });

    example("request 2", async () => {
        return {
            isError:true,
        }
    });
}, {
    literals:{
        isError:true,
        dataType:true,
    }
});
```
This will generate the current type

```typescript
export type literalExample = {
  isError: true | false,
  data: undefined | string,
  dataType: "type 2" | "type 1" | "type 3" | undefined,
};
```
### Other parameters
- `useXOR` if set to `true` layj will combine the types usnig [XOR](https://github.com/maninak/ts-xor)
- `snapshot` if set to `false` layj will skip creating the type snapshots
- `throwOnTypeChange` if set to `false` layj wont throw an error if the generated type is different from the snapshot type
- `jsDoc` if set to `true` layj will generate JSDoc comments instead of typescirpt files
- `snapshotsDir` if set layj will use this directory for the snapshots
- `outDir` if set layj will use this directory for the generated types
- `literals` this is an object that specifies if the value under a specific path should be used as a literal type instead of the more general type ([see example above](#literals))

## CLI

layj commes with a cli that you can use to watch for changes to the type generator files and execute them. To use the cli you can add a watch commad in your `pacage.json` ex:

```json
{
    "scriprs":{
        "watch-api-types":"layj watch",
        "generate-api-types":"layj generate",
    }
}
```
both `watch` and `generate` commands accept sevral flags to overwrite de default behaviour
- `--f` ignores snapshot errors equivalent to setting `throwOnTypeChange:false`
- `--noSnapshots` ignores snapshot errors equivalent to setting `snapshot:false`
- `--conf` flag specifies a global conf file by default layj looks for `layj.config.js`
- `--outDir`, `--jsDoc`, `--useXOR`, `--snapshotsDir` behave the same as their parameters equivalent

### Watch mode

While you are working on a generator file and introduce changes that produce a type different than the one in the snapshot you can press `r` to ignore the errors and regenerate new snapshots.

## Configuration

layj has 4 levels of configuration, layj combines those to a single config, in this order
- the default config
- the config from `layj.config.js` or the file specified by the `--conf` argument
- the config from the command line arguments
- the config provided as argument to the `layj` function

This means that parameters provided to the `layj` function will allways overwite all other parameters.

## Contribution
- Before making commits, please open an issue to make sure the changes made are in the scope of layj
- Keep the code simple and short.
- Make sure you don't introduce new unexpected behavour
- Thats it, have fun