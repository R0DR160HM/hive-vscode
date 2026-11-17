# Hive for VS Code

[Hive](https://github.com/R0DR160HM/hive-lang) in VS Code.
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
