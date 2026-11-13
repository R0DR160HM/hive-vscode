// The grammar, held to what it says about Hive source. It is tokenized by the
// engine VS Code runs, so a scope asserted here is the scope a theme is handed.
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const oniguruma = require('vscode-oniguruma');
const textmate = require('vscode-textmate');

const file = path.join(__dirname, '..', 'syntaxes', 'hive.tmLanguage.json');

const loaded = (async () => {
  const wasm = fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm'));
  await oniguruma.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
  const registry = new textmate.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
      createOnigString: (text) => new oniguruma.OnigString(text),
    }),
    loadGrammar: async (scope) => (scope === 'source.hive' ? textmate.parseRawGrammar(fs.readFileSync(file, 'utf8'), file) : null),
  });
  return registry.loadGrammar('source.hive');
})();

// Every token of the source that is not blank, and how deep the last line ended.
async function read(source) {
  const grammar = await loaded;
  const tokens = [];
  let stack = textmate.INITIAL;
  for (const line of source.split(/\r?\n/)) {
    const result = grammar.tokenizeLine(line, stack);
    stack = result.ruleStack;
    for (const token of result.tokens) {
      const text = line.slice(token.startIndex, token.endIndex);
      if (text.trim() !== '') {
        tokens.push({ text: text.trim(), scopes: token.scopes });
      }
    }
  }
  return { tokens, depth: stack.depth };
}

// The tokens named, in the order written, each carrying its scope. A scope
// opening with `!` is one the token must not carry, nor any scope under it.
async function scoped(source, expected) {
  const { tokens, depth } = await read(source);
  let from = 0;
  for (const [text, scope] of expected) {
    const found = tokens.findIndex((token, i) => i >= from && token.text === text);
    assert.notStrictEqual(found, -1, `no token \`${text}\` in: ${source}`);
    const scopes = tokens[found].scopes;
    if (scope.startsWith('!')) {
      const refused = scope.slice(1);
      assert.ok(!scopes.some((s) => s === refused || s.startsWith(refused + '.')), `\`${text}\` is ${scopes.join(' ')}`);
    } else {
      assert.ok(scopes.includes(scope), `\`${text}\` is ${scopes.join(' ')}, not ${scope}`);
    }
    from = found + 1;
  }
  return depth;
}

test('the sample is read to its end, and nothing in it is left plain', async () => {
  const source = fs.readFileSync(path.join(__dirname, 'sample.hive'), 'utf8');
  const { tokens, depth } = await read(source);
  assert.strictEqual(depth, 1);
  // A column or a table in a query body is the one thing with no scope of its own.
  const plain = tokens.filter((token) => token.scopes.length === 1 || token.scopes[token.scopes.length - 1] === 'meta.query.hive');
  assert.deepStrictEqual(plain.map((token) => token.text), []);
});

test('keywords', async () => {
  await scoped('if a { return } else { for each x in v { break } }', [
    ['if', 'keyword.control.hive'],
    ['return', 'keyword.control.hive'],
    ['else', 'keyword.control.hive'],
    ['each', 'keyword.control.hive'],
    ['in', 'keyword.control.hive'],
    ['break', 'keyword.control.hive'],
  ]);
  await scoped('mut Str[dyn] v = []', [['mut', 'storage.modifier.hive'], ['dyn', 'storage.modifier.hive']]);
  await scoped('if v bounds i && x is true { echo x }', [
    ['bounds', 'keyword.operator.expression.hive'],
    ['is', 'keyword.operator.expression.hive'],
    ['true', 'constant.language.boolean.hive'],
    ['echo', 'keyword.other.echo.hive'],
  ]);
});

test('only a keyword\'s lower-case spelling is one', async () => {
  await scoped('Return := IF', [['Return', '!keyword'], ['IF', '!keyword']]);
  await scoped('timeout := 3', [['timeout', 'variable.other.hive']]);
  await scoped('f(x) with timeout 500', [['with', 'keyword.control.with.hive'], ['timeout', 'keyword.control.timeout.hive']]);
});

test('a comment, and an import whose path holds two slashes', async () => {
  await scoped('x := 1 // the rest', [['x', 'variable.other.hive'], ['//', 'comment.line.double-slash.hive']]);
  await scoped('import https://github.com/owner/repo@v1/src/text as words // why', [
    ['import', 'keyword.control.import.hive'],
    ['https://github.com/owner/repo@v1/src/text', 'string.unquoted.import.hive'],
    ['as', 'keyword.control.as.hive'],
    ['words', 'entity.name.namespace.hive'],
    ['//', 'comment.line.double-slash.hive'],
  ]);
  await scoped('import hive.net as web', [['hive.net', 'entity.name.namespace.hive'], ['web', 'entity.name.namespace.hive']]);
  await scoped('import "./lib/my file" as mine', [['"./lib/my file"', 'string.quoted.double.import.hive'], ['as', 'keyword.control.as.hive']]);
});

test('a string: escapes, interpolation, and a string inside one', async () => {
  const depth = await scoped('echo "a \\{ b {len("x{y}")} c" + z', [
    ['\\{', 'constant.character.escape.hive'],
    ['{', 'punctuation.definition.template-expression.begin.hive'],
    ['len', 'support.function.builtin.hive'],
    ['x', 'string.quoted.double.hive'],
    ['y', 'meta.embedded.line.hive'],
    ['c', 'string.quoted.double.hive'],
    ['z', '!string'],
  ]);
  assert.strictEqual(depth, 1);
});

test('a string pattern\'s hole keeps its regex to itself', async () => {
  const depth = await scoped('if s is "{year is (\\d{4})}-{file is ([\\w)-]+)}.{ext}" { }', [
    ['year', 'variable.other.hive'],
    ['is', 'keyword.operator.expression.is.hive'],
    ['\\d', 'string.regexp.hive'],
    ['{4}', 'keyword.operator.quantifier.regexp'],
    ['file', 'variable.other.hive'],
    ['[', 'constant.other.character-class.set.regexp'],
    ['ext', 'meta.embedded.line.hive'],
    ['{', 'punctuation.section.block.begin.hive'],
  ]);
  assert.strictEqual(depth, 1);
});

test('a backtick string: one escape, and it ends at its backtick whatever it holds', async () => {
  await scoped('s := `func f() \\{ }\n  {name} \\n`\nx', [
    ['\\{', 'constant.character.escape.hive'],
    ['name', 'meta.embedded.line.hive'],
    ['\\n', '!constant.character.escape'],
    ['x', '!string'],
  ]);
  assert.strictEqual(await scoped('s := `open { never closed`\nx := 1', [['x', '!string']]), 1);
});

test('numbers, atoms and constants', async () => {
  await scoped('MAX_TRIES := 0xFF_FF + 0b1010 + 1_000 + 2.5', [
    ['MAX_TRIES', 'variable.other.constant.hive'],
    ['0xFF_FF', 'constant.numeric.hex.hive'],
    ['0b1010', 'constant.numeric.binary.hive'],
    ['1_000', 'constant.numeric.integer.hive'],
    ['2.5', 'constant.numeric.float.hive'],
  ]);
  await scoped('if state == #Ready { v[1:2] }', [['#Ready', 'constant.other.symbol.hive'], ['1', 'constant.numeric.integer.hive'], ['2', 'constant.numeric.integer.hive']]);
});

test('types, variants and what is reached through a module', async () => {
  await scoped('Result<User[dyn], hive.sql.SqlError> r = Result.Ok(text.Align.Left())', [
    ['Result', 'support.type.builtin.hive'],
    ['User', 'entity.name.type.hive'],
    ['hive', 'entity.name.namespace.hive'],
    ['sql', 'entity.name.namespace.hive'],
    ['SqlError', 'entity.name.type.hive'],
    ['Result', 'support.type.builtin.hive'],
    ['Ok', 'variable.other.enummember.hive'],
    ['text', 'entity.name.namespace.hive'],
    ['Align', 'entity.name.type.hive'],
    ['Left', 'variable.other.enummember.hive'],
  ]);
  await scoped('UInt4 a = UInt4.checked(Int63(b)) + Float32(c)', [
    ['UInt4', 'support.type.primitive.hive'],
    ['checked', 'entity.name.function.call.hive'],
    ['Int63', 'support.type.primitive.hive'],
    ['Float32', 'support.type.primitive.hive'],
  ]);
});

test('a type\'s fields, variants and annotations', async () => {
  const depth = await scoped('type Event { at: Int -- JSON as "sent at"; Default as -1; by: hive.map.Map<Str, Int>, Opened { why: Str -- Flag as dry-run; } Closed }\nx', [
    ['type', 'storage.type.type.hive'],
    ['Event', 'entity.name.type.hive'],
    ['at', 'variable.other.member.hive'],
    ['Int', 'support.type.primitive.hive'],
    ['--', 'punctuation.definition.annotation.hive'],
    ['JSON', 'entity.other.attribute-name.hive'],
    ['as', 'keyword.control.as.hive'],
    ['"sent at"', 'string.quoted.double.hive'],
    ['Default', 'entity.other.attribute-name.hive'],
    ['1', 'constant.numeric.integer.hive'],
    ['by', 'variable.other.member.hive'],
    ['Map', 'entity.name.type.hive'],
    ['Int', 'support.type.primitive.hive'],
    ['Opened', 'variable.other.enummember.hive'],
    ['why', 'variable.other.member.hive'],
    ['dry-run', 'string.unquoted.hive'],
    ['Closed', 'variable.other.enummember.hive'],
    ['x', '!meta.type'],
  ]);
  assert.strictEqual(depth, 1);
});

test('a declaration\'s name and parameters', async () => {
  await scoped('proc grow(vec: mut Str[dyn], each: func(T): Result<K, E>): void {', [
    ['proc', 'storage.type.function.hive'],
    ['grow', 'entity.name.function.hive'],
    ['vec', 'variable.parameter.hive'],
    ['mut', 'storage.modifier.hive'],
    ['func', 'storage.type.function.hive'],
    ['T', 'entity.name.type.hive'],
    ['Result', 'support.type.builtin.hive'],
    ['void', 'support.type.primitive.hive'],
    ['{', '!meta.function'],
  ]);
  await scoped('test "an empty cart costs nothing" {', [['test', 'storage.type.hive'], ['an empty cart costs nothing', 'string.quoted.double.hive']]);
});

test('calls, builtins and named arguments', async () => {
  await scoped('echo join(sep: ",", vector: names) + hive.len(v) + text.len(v) + area(shape)', [
    ['join', 'support.function.builtin.hive'],
    ['sep', 'variable.parameter.hive'],
    ['len', 'support.function.builtin.hive'],
    ['len', 'entity.name.function.call.hive'],
    ['area', 'entity.name.function.call.hive'],
  ]);
  await scoped('nums |> filter(isEven) |> label', [['|>', 'keyword.operator.pipe.hive'], ['filter', 'support.function.builtin.hive'], ['label', 'entity.name.function.call.hive']]);
  await scoped('a.b = v[lo:hi]', [['b', 'variable.other.property.hive'], ['lo', 'variable.other.hive']]);
});

test('a binary pattern', async () => {
  await scoped('if p is <<size: UInt16 little, _: UInt3, ...rest>> { }', [
    ['size', 'variable.parameter.hive'],
    ['UInt16', 'support.type.primitive.hive'],
    ['little', 'storage.modifier.little.hive'],
    ['_', 'variable.language.wildcard.hive'],
    ['...', 'keyword.operator.rest.hive'],
    ['rest', 'variable.other.hive'],
  ]);
  await scoped('little := 1', [['little', 'variable.other.hive']]);
});

test('a query body is SQL, and what it interpolates is Hive', async () => {
  const depth = await scoped([
    'query findUser(',
    '    name: Str,',
    '): User[dyn] {',
    '    SELECT id, count(*) AS total FROM users -- every {name}',
    "    WHERE owner = {name} AND note = 'it''s {name}' /* done */",
    '}',
    'proc main(): void { }',
  ].join('\n'), [
    ['query', 'storage.type.query.hive'],
    ['findUser', 'entity.name.function.hive'],
    ['name', 'variable.parameter.hive'],
    ['User', 'entity.name.type.hive'],
    ['SELECT', 'keyword.other.sql'],
    ['count', 'support.function.sql'],
    ['AS', 'keyword.other.sql'],
    ['--', 'comment.line.double-dash.sql'],
    ['name', 'meta.embedded.line.hive'],
    ['WHERE', 'keyword.other.sql'],
    ['name', 'meta.embedded.line.hive'],
    ['AND', 'keyword.other.sql'],
    ['it', 'string.quoted.single.sql'],
    ["''", 'constant.character.escape.sql'],
    ['name', 'meta.embedded.line.hive'],
    ['/*', 'comment.block.sql'],
    ['proc', '!meta.query'],
    ['main', 'entity.name.function.hive'],
  ]);
  assert.strictEqual(depth, 1);
});

test('a query body closes at its brace, a comment before it or not', async () => {
  assert.strictEqual(await scoped('query q(): void { DELETE FROM users -- all }\nx := 1', [['DELETE', 'keyword.other.sql'], ['x', '!meta.query']]), 1);
  assert.strictEqual(await scoped('query q(): Str[dyn] { select name from users }\nx := 1', [['select name from users', 'meta.embedded.block.sql'], ['x', '!meta.query']]), 1);
});

test('a WHERE block: Hive conditions around SQL predicates', async () => {
  const depth = await scoped([
    'query find(apiary: Str, small: Bool): Colony[dyn] {',
    '    SELECT name FROM colonies',
    '    WHERE {',
    '        if apiary != "" { apiary = {apiary} }',
    '        or {',
    '            if small { frames < 4 }',
    '        }',
    '    }',
    '    ORDER BY name',
    '}',
    'x := 1',
  ].join('\n'), [
    ['WHERE', 'keyword.other.sql'],
    ['if', 'keyword.control.hive'],
    ['apiary', 'variable.other.hive'],
    ['!=', 'keyword.operator.comparison.hive'],
    ['=', 'keyword.operator.sql'],
    ['apiary', 'meta.interpolation.hive'],
    ['or', 'keyword.control.hive'],
    ['small', 'variable.other.hive'],
    ['<', 'keyword.operator.sql'],
    ['4', 'constant.numeric.sql'],
    ['ORDER', 'keyword.other.sql'],
    ['x', '!meta.query'],
  ]);
  assert.strictEqual(depth, 1);
});
