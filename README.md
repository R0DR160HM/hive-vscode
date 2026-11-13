# Hive for VS Code

[Hive](https://github.com/R0DR160HM/hive-lang) in VS Code. A `.hive` file is
coloured, and the compiler's own language server, `hive lsp`, says the rest:

* **what is wrong**, as you type, in the file and in the files it imports;
* **what a name is**, on hover: a variable's type, a function's signature, a
  field, a variant, a library call;
* **where a name was declared**, with `F12`, in this file or another;
* **what could come next**, with `Ctrl+Space` or after a `.`: a value's fields,
  a module's calls, a type's variants, the names in scope;
* **the file's outline**, and **Format Document**, which reindents the file as
  `hive indent` would.

## What it needs

The server is the compiler itself, from **v0.3.7** on:

```sh
$ hive version
v0.3.7
```

[INSTALL.md](https://github.com/R0DR160HM/hive-lang/blob/master/INSTALL.md)
installs it, and `hive use v0.3.7` moves an older one forward. The extension
starts whatever `hive` is on the `PATH` VS Code was started with, and the
`hive.path` setting names another.

Colouring and snippets need no compiler at all.

## Installing it

It is on the Marketplace as
[Hive Language](https://marketplace.visualstudio.com/items?itemName=R0DR160HM.hive-lang).
Search for that name in VS Code's Extensions view, or install it from a shell:

```sh
$ code --install-extension R0DR160HM.hive-lang
```

Then open a `.hive` file.

## What is coloured

* **Keywords**, and only their lower-case spelling, which is the only one Hive
  reserves: `Return` is a name. `timeout`, `as` and `little` are keywords only
  where they are written as one.
* **Names by their shape**: a `PascalCase` type, the variant after its `.`, an
  `UPPER_CASE` constant, an `#Atom`, a call, a builtin, and `hive.` with the
  module behind it.
* **Both string forms**, with a `{expression}` inside one read as Hive rather
  than text, and a string pattern's `{name is (regex)}` read as a regex.
* **A `query` body as SQL**, with each `{param}` and each condition of a
  `WHERE { }` block read as Hive. `Ctrl+/` there writes SQL's `--`.
* **A type's body**: its fields, its variants, and annotations like
  `-- JSON as user_name;`.

## Snippets

`main`, `proc`, `func`, `query`, `type`, `union`, `test`, `for`, `foreach`,
`ifis`, `ifbounds` and `switch`.

## Settings

| setting | default | what it is |
| --- | --- | --- |
| `hive.path` | `hive` | the compiler to start as the language server, when it is not `hive` on the `PATH` |
| `hive.trace.server` | `off` | `messages` or `verbose` writes what the editor and the server say to each other to the **Hive** channel of the Output panel |

**Hive: Restart Language Server**, in the Command Palette, starts the server
again: after `hive` was upgraded, say. Changing `hive.path` restarts it by
itself.

A new Hive file is indented with four spaces, which is what `hive indent`
writes.

## When nothing happens

* **The Output panel has a Hive channel** with what the server said.
* **"`hive` could not be run"**: it is not on the `PATH` VS Code was started
  with. Start VS Code from a shell where `hive version` answers, or name the
  compiler in `hive.path`:

  ```json
  { "hive.path": "C:\\Users\\you\\bin\\hive.exe" }
  ```

* **"`hive` is v0.3.2, and the language server is in v0.3.7 and later"**: that
  compiler is from before the server. `hive use v0.3.7` moves it forward.
* **The file is coloured and nothing else happens, in Restricted Mode.** The
  server reads what a file imports, a git repository included, so it is not
  started in a workspace you have not trusted. Trusting the workspace starts
  it.

## What it does not do yet

Find references, rename and signature help, and saying what a name is inside a
backtick string or a `query` body. Those are the server's to learn:
[LSP.md](https://github.com/R0DR160HM/hive-lang/blob/master/LSP.md) keeps the
list.

## Working on it

```sh
$ npm install
$ npm test
```

`F5` in VS Code opens a second window with the extension loaded from this
folder and `test/sample.hive` in it.

* `syntaxes/hive.tmLanguage.json` is the grammar. `npm test` tokenizes Hive
  with the engine VS Code runs and holds the scopes that come out to the ones
  `test/grammar.test.js` names.
* `src/extension.js` is the client, which starts `hive lsp`. `npm run build`
  bundles it into `dist/`, and `npm run package` does that and writes
  `hive-lang.vsix`, which `code --install-extension hive-lang.vsix` installs.
  Packaging takes [Node.js](https://nodejs.org) 22 or later.
* `test/sample.hive` is a program with something of everything in it:
  `hive run test/sample.hive` runs it.

## License

[MIT](LICENSE).
