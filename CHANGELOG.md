# Changelog

## Unreleased

* **`law` is coloured as a declaration**, with its name as a function's, and has a snippet.
* **`axiom` is marked as an error**: the compiler reserves it and refuses every use.
* **A law inside a type is coloured as code**, where its body was read as more fields.
* **A law about a table has its body coloured as SQL**, as a query's is.

## 0.2.0

* **A `.hive` file is coloured**: keywords, names by their shape, both string forms and what they interpolate, a `query` body as SQL.
* **Snippets** for a declaration of each kind, the two loops, `if is`, `if bounds` and `switch`.
* **Hive: Restart Language Server**, and changing `hive.path` restarts it too.
* **A `hive` that is missing, or from before v0.3.7, is said so**, where the server silently failed to start.
* **A `hive` that is a `.cmd` starts on Windows**, where only an `.exe` did.
* **The server is not started in an untrusted workspace**, since it reads what a file imports.
* **`.hive` files have an icon.**
* **The extension has a repository of its own**; it was `editors/vscode` in the compiler's.

## 0.1.0

* **The language server in VS Code**: `hive lsp` started for `.hive` files, for errors as you type, hover, go to definition, completion, an outline and formatting.
