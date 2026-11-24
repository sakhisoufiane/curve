# Mocha → Jest API Mapping Reference

## Lifecycle Hooks

| Mocha | Jest | Notes |
|-------|------|-------|
| `before(fn)` | `beforeAll(fn)` | Runs once before all tests in block |
| `after(fn)` | `afterAll(fn)` | Runs once after all tests in block |
| `beforeEach(fn)` | `beforeEach(fn)` | Compatible — no change needed |
| `afterEach(fn)` | `afterEach(fn)` | Compatible — no change needed |
| `describe(name, fn)` | `describe(name, fn)` | Compatible — no change needed |
| `it(name, fn)` | `it(name, fn)` or `test(name, fn)` | Compatible — no change needed |
| `it.only(...)` | `it.only(...)` or `test.only(...)` | Compatible |
| `it.skip(...)` | `it.skip(...)` or `test.skip(...)` | Compatible |
| `describe.only(...)` | `describe.only(...)` | Compatible |
| `describe.skip(...)` | `describe.skip(...)` | Compatible |
| `this.timeout(ms)` | `jest.setTimeout(ms)` | Call at top of `describe` block, not inside `it` |
| `this.slow(ms)` | _(no equivalent)_ | Remove — Jest has no slow threshold |
| `this.retries(n)` | `jest.retryTimes(n)` | Call at top of `describe` or test file |

---

## Chai → Jest Assertion Mappings

### Equality

| Chai | Jest | Notes |
|------|------|-------|
| `expect(a).to.equal(b)` | `expect(a).toBe(b)` | Strict equality (`===`) |
| `expect(a).to.not.equal(b)` | `expect(a).not.toBe(b)` | |
| `expect(a).to.deep.equal(b)` | `expect(a).toEqual(b)` | Deep/structural equality |
| `expect(a).to.not.deep.equal(b)` | `expect(a).not.toEqual(b)` | |
| `expect(a).to.eql(b)` | `expect(a).toEqual(b)` | `eql` is Chai's deep equal alias |
| `expect(a).to.deep.include(b)` | `expect(a).toMatchObject(b)` | Partial object match |
| `expect(a).to.equal(b).and.to.equal(c)` | Separate `expect()` calls | Jest doesn't chain assertions |

### Truthiness

| Chai | Jest | Notes |
|------|------|-------|
| `expect(x).to.be.true` | `expect(x).toBe(true)` | |
| `expect(x).to.be.false` | `expect(x).toBe(false)` | |
| `expect(x).to.be.null` | `expect(x).toBeNull()` | |
| `expect(x).to.be.undefined` | `expect(x).toBeUndefined()` | |
| `expect(x).to.exist` | `expect(x).toBeDefined()` | Not null or undefined |
| `expect(x).to.be.ok` | `expect(x).toBeTruthy()` | |
| `expect(x).to.not.be.ok` | `expect(x).toBeFalsy()` | |
| `expect(x).to.be.NaN` | `expect(x).toBeNaN()` | |

### Type Checking

| Chai | Jest | Notes |
|------|------|-------|
| `expect(x).to.be.a('string')` | `expect(typeof x).toBe('string')` | |
| `expect(x).to.be.a('number')` | `expect(typeof x).toBe('number')` | |
| `expect(x).to.be.a('boolean')` | `expect(typeof x).toBe('boolean')` | |
| `expect(x).to.be.an('array')` | `expect(Array.isArray(x)).toBe(true)` | |
| `expect(x).to.be.an.instanceof(Cls)` | `expect(x).toBeInstanceOf(Cls)` | |
| `expect(x).to.be.instanceOf(Cls)` | `expect(x).toBeInstanceOf(Cls)` | |

### Numeric Comparisons

| Chai | Jest | Notes |
|------|------|-------|
| `expect(n).to.be.above(x)` | `expect(n).toBeGreaterThan(x)` | |
| `expect(n).to.be.below(x)` | `expect(n).toBeLessThan(x)` | |
| `expect(n).to.be.at.least(x)` | `expect(n).toBeGreaterThanOrEqual(x)` | |
| `expect(n).to.be.at.most(x)` | `expect(n).toBeLessThanOrEqual(x)` | |
| `expect(n).to.be.within(lo, hi)` | `expect(n).toBeGreaterThanOrEqual(lo); expect(n).toBeLessThanOrEqual(hi)` | Split into two assertions |
| `expect(n).to.be.closeTo(x, delta)` | `expect(n).toBeCloseTo(x, precision)` | Note: delta vs decimal places |

### Strings

| Chai | Jest | Notes |
|------|------|-------|
| `expect(s).to.include(sub)` | `expect(s).toContain(sub)` | |
| `expect(s).to.contain(sub)` | `expect(s).toContain(sub)` | |
| `expect(s).to.match(/regex/)` | `expect(s).toMatch(/regex/)` | |
| `expect(s).to.have.length(n)` | `expect(s).toHaveLength(n)` | |
| `expect(s).to.have.lengthOf(n)` | `expect(s).toHaveLength(n)` | |
| `expect(s).to.be.empty` | `expect(s).toHaveLength(0)` or `expect(s).toBe('')` | |
| `expect(s).to.start.with(prefix)` | `expect(s).toMatch(/^prefix/)` or manual | |
| `expect(s).to.end.with(suffix)` | `expect(s).toMatch(/suffix$/)` or manual | |

### Arrays

| Chai | Jest | Notes |
|------|------|-------|
| `expect(arr).to.include(val)` | `expect(arr).toContain(val)` | |
| `expect(arr).to.contain(val)` | `expect(arr).toContain(val)` | |
| `expect(arr).to.have.length(n)` | `expect(arr).toHaveLength(n)` | |
| `expect(arr).to.have.lengthOf(n)` | `expect(arr).toHaveLength(n)` | |
| `expect(arr).to.be.empty` | `expect(arr).toHaveLength(0)` or `expect(arr).toEqual([])` | |
| `expect(arr).to.include.members([a,b])` | `expect(arr).toEqual(expect.arrayContaining([a,b]))` | |
| `expect(arr).to.have.members([a,b])` | `expect(arr).toEqual(expect.arrayContaining([a,b]))` (+ length check) | |

### Objects / Properties

| Chai | Jest | Notes |
|------|------|-------|
| `expect(obj).to.have.property('key')` | `expect(obj).toHaveProperty('key')` | |
| `expect(obj).to.have.property('key', val)` | `expect(obj).toHaveProperty('key', val)` | |
| `expect(obj).to.have.deep.property('a.b', val)` | `expect(obj).toHaveProperty('a.b', val)` | Dot notation supported |
| `expect(obj).to.include.keys('a', 'b')` | `expect(obj).toMatchObject({ a: expect.anything(), b: expect.anything() })` | |
| `expect(obj).to.have.all.keys('a', 'b')` | `expect(Object.keys(obj).sort()).toEqual(['a', 'b'].sort())` | |

### Errors / Exceptions

| Chai | Jest | Notes |
|------|------|-------|
| `expect(fn).to.throw()` | `expect(fn).toThrow()` | fn must be wrapped: `() => fn()` |
| `expect(fn).to.throw(Error)` | `expect(fn).toThrow(Error)` | |
| `expect(fn).to.throw('message')` | `expect(fn).toThrow('message')` | |
| `expect(fn).to.throw(Error, 'msg')` | `expect(fn).toThrow('msg')` | Jest matches on message string/regex |
| `expect(fn).to.not.throw()` | `expect(fn).not.toThrow()` | |
| `expect(promise).to.be.rejectedWith(Error)` | `await expect(promise).rejects.toThrow(Error)` | |
| `expect(promise).to.be.fulfilled` | `await expect(promise).resolves.toBeDefined()` | |

### Async Assertions

| Chai (chai-as-promised) | Jest | Notes |
|------------------------|------|-------|
| `return expect(p).to.be.fulfilled` | `await expect(p).resolves.toBeDefined()` | |
| `return expect(p).to.eventually.equal(x)` | `await expect(p).resolves.toBe(x)` | |
| `return expect(p).to.be.rejectedWith(E)` | `await expect(p).rejects.toThrow(E)` | |

---

## Sinon → Jest Mock Mappings

### Creating Mocks

| Sinon | Jest | Notes |
|-------|------|-------|
| `sinon.spy()` | `jest.fn()` | Standalone mock function |
| `sinon.spy(obj, 'method')` | `jest.spyOn(obj, 'method')` | Wraps existing method |
| `sinon.stub()` | `jest.fn()` | Standalone mock function |
| `sinon.stub(obj, 'method')` | `jest.spyOn(obj, 'method')` | Wraps and mocks existing method |
| `sinon.mock(obj)` | Use `jest.spyOn()` per method | Jest has no object-level mock |
| `sinon.createSandbox()` | _(not needed)_ | Use `jest.config.js` `restoreMocks: true` or `afterEach(() => jest.restoreAllMocks())` |

### Configuring Return Values

| Sinon | Jest | Notes |
|-------|------|-------|
| `stub.returns(val)` | `mockFn.mockReturnValue(val)` | |
| `stub.returnsArg(n)` | `mockFn.mockImplementation((...args) => args[n])` | |
| `stub.resolves(val)` | `mockFn.mockResolvedValue(val)` | |
| `stub.rejects(err)` | `mockFn.mockRejectedValue(err)` | |
| `stub.callsFake(fn)` | `mockFn.mockImplementation(fn)` | |
| `stub.onFirstCall().returns(a)` | `mockFn.mockReturnValueOnce(a)` | |
| `stub.onSecondCall().returns(b)` | `mockFn.mockReturnValueOnce(a).mockReturnValueOnce(b)` | Chain `.mockReturnValueOnce` |
| `stub.withArgs(x).returns(y)` | Use `mockImplementation` with conditional | No direct equivalent |
| `stub.throws(new Error('msg'))` | `mockFn.mockImplementation(() => { throw new Error('msg') })` | |

### Sinon Assertions → Jest Matchers

| Sinon | Jest | Notes |
|-------|------|-------|
| `expect(spy.called).to.be.true` | `expect(mockFn).toHaveBeenCalled()` | |
| `expect(spy.notCalled).to.be.true` | `expect(mockFn).not.toHaveBeenCalled()` | |
| `expect(spy.calledOnce).to.be.true` | `expect(mockFn).toHaveBeenCalledTimes(1)` | |
| `expect(spy.calledTwice).to.be.true` | `expect(mockFn).toHaveBeenCalledTimes(2)` | |
| `sinon.assert.called(spy)` | `expect(mockFn).toHaveBeenCalled()` | |
| `sinon.assert.calledOnce(spy)` | `expect(mockFn).toHaveBeenCalledTimes(1)` | |
| `sinon.assert.calledWith(spy, a, b)` | `expect(mockFn).toHaveBeenCalledWith(a, b)` | |
| `sinon.assert.calledWithExactly(spy, a)` | `expect(mockFn).toHaveBeenCalledWith(a)` | |
| `spy.firstCall.args` | `mockFn.mock.calls[0]` | |
| `spy.lastCall.args` | `mockFn.mock.calls[mockFn.mock.calls.length - 1]` | |
| `spy.args[n]` | `mockFn.mock.calls[n]` | |
| `spy.returnValues[n]` | `mockFn.mock.results[n].value` | |

### Cleanup / Restore

| Sinon | Jest | Notes |
|-------|------|-------|
| `stub.restore()` | `mockFn.mockRestore()` | Only works for `jest.spyOn` mocks |
| `sandbox.restore()` | `jest.restoreAllMocks()` | Restores all `jest.spyOn` mocks |
| `sinon.restore()` | `jest.restoreAllMocks()` | |
| `stub.reset()` | `mockFn.mockReset()` | Clears calls + implementation |
| `stub.resetBehavior()` | `mockFn.mockReset()` | |
| `sinon.resetHistory()` | `jest.clearAllMocks()` | Clears call history only |

### Fake Timers

| Sinon | Jest | Notes |
|-------|------|-------|
| `const clock = sinon.useFakeTimers()` | `jest.useFakeTimers()` | |
| `clock.tick(ms)` | `jest.advanceTimersByTime(ms)` | |
| `clock.restore()` | `jest.useRealTimers()` | |
| `clock.runAll()` | `jest.runAllTimers()` | |
| `clock.runAllAsync()` | `jest.runAllTimersAsync()` | |
| `sinon.useFakeTimers({ now: Date })` | `jest.useFakeTimers({ now: Date })` | |

### Module Mocking (Sinon → Jest)

Sinon doesn't have first-class module mocking. Jest does:

```js
// Mock an entire module
jest.mock('./myModule');
jest.mock('./myModule', () => ({ fn: jest.fn() }));

// Mock only in one test
jest.doMock('./myModule', () => ({ fn: jest.fn() }));

// Restore module to real implementation
jest.unmock('./myModule');

// Spy on named export
import * as mod from './myModule';
jest.spyOn(mod, 'myFunction').mockReturnValue(42);
```

---

## Import/Require Cleanup

Lines to remove from every test file:

```js
// Remove all of these:
const chai = require('chai');
const { expect } = require('chai');
const { assert } = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
chai.use(sinonChai);
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

// Jest's expect is a global — no import needed
```

---

## Jest-Specific Patterns Without Mocha Equivalent

```js
// Snapshot testing
expect(component).toMatchSnapshot();
expect(output).toMatchInlineSnapshot(`"expected string"`);

// Mock return value only once
mockFn.mockReturnValueOnce(value);

// Partial object matching
expect(obj).toMatchObject({ key: 'value' });

// Asymmetric matchers
expect(fn).toHaveBeenCalledWith(
  expect.objectContaining({ id: 1 }),
  expect.arrayContaining([1, 2]),
  expect.stringContaining('foo'),
  expect.any(Number),
  expect.anything()
);

// Coverage thresholds in jest.config.js
coverageThreshold: {
  global: { branches: 80, functions: 80, lines: 80, statements: 80 }
}
```
