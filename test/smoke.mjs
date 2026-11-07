/**
 * Headless smoke test for the sidebar usage card.
 *
 * Runs the real browser bundle outside a browser: a minimal `window`,
 * `document`, `react` and `require` stand in for the module loader's platform
 * seeds, then the card is rendered twice — once while loading, once after the
 * refresh settles — so the account mapping, the month/today aggregation, the
 * pricing and the context bar are all exercised without the GUI.
 *
 *   node test/smoke.mjs
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import assert from 'node:assert/strict'

const here = path.dirname(fileURLToPath(import.meta.url))
const source = readFileSync(path.join(here, '..', 'lib', 'client.js'), 'utf8')

//#region platform stubs
const storage = new Map()
storage.set('dsh.sessions.current', JSON.stringify({ sessionId: 'recent' }))
const window_ = {
	localStorage: {
		getItem: (key) => (storage.has(key) ? storage.get(key) : null),
		setItem: (key, value) => storage.set(key, String(value)),
	},
	setInterval: () => 0,
	clearInterval: () => {},
	open: () => {},
}
const document_ = {
	head: { appendChild: () => {} },
	querySelector: () => null,
	createElement: () => ({ dataset: {}, textContent: '' }),
}

/** Element/component tree the last render produced, flattened to text. */
const flatten = (node) => {
	if (node === null || node === undefined || node === false) return ''
	if (typeof node === 'string' || typeof node === 'number') return String(node)
	if (Array.isArray(node)) return node.map(flatten).join('')
	const children = node.children ?? node.props?.children
	return Array.isArray(children) ? children.map(flatten).join('') : flatten(children)
}

let lastRender = null
const react = {
	createElement: (type, props, ...children) => {
		const node = { type, props: props ?? {}, children: children.flat() }
		if (typeof type === 'function') {
			lastRender = type({ ...(props ?? {}), children: node.children })
			return lastRender
		}
		return node
	},
	useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
	useEffect: (effect) => {
		effect()
	},
	useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
	useRef: (value) => ({ current: value }),
	useMemo: (factory) => factory(),
	useCallback: (fn) => fn,
}
//#endregion

//#region fake services
const NOW = Date.now()
const MONTH_START = new Date(new Date(NOW).getFullYear(), new Date(NOW).getMonth(), 1).getTime()

const sessionState = {
	phase: 'ready',
	ids: ['recent', 'older'],
	byId: {
		recent: { id: 'recent', updatedAt: NOW },
		older: { id: 'older', updatedAt: MONTH_START - 86400000 },
	},
	projectionsBySession: {},
}

const reads = []
const sessions = {
	list: { getSnapshot: () => sessionState, subscribe: () => () => {} },
	refreshProjections: async (sessionId) => {
		reads.push(sessionId)
		sessionState.projectionsBySession[sessionId] = {
			values: {
				// The client view of `tokenUsage` is the flattened totals object.
				tokenUsage: { uncachedInputTokens: 1000, outputTokens: 500, cacheReadTokens: 4000, cacheWriteTokens: 100 },
				modelSelection: { lastUsed: { provider: 'deepseek-account', model: 'deepseek-flash', reasoningEffort: 'high' }, next: null },
				contextPressure: { contextWindow: 1 << 20, pressureTokens: 400000, projectedTokens: 650000, surfaceTokens: 250000, sampledSurfaceTokens: 0 },
			},
		}
	},
}

const account = {
	getState: async () => ({ ok: true, value: { status: 'credential-stored', links: { usageUrl: 'https://platform/usage', topUpUrl: 'https://platform/topup' } } }),
	getBalance: async () => ({ ok: true, value: { status: 'ready', value: [{ currency: 'CNY', balance: '12.34' }], bonusWallets: [{ currency: 'CNY', balance: '2' }] } }),
}

const registered = []
const ctx = {
	locale: {
		register: () => () => {},
		getSnapshot: () => ({ active: 'zh-CN' }),
		subscribe: () => () => {},
	},
	slots: {
		inject: (_name, factory) => factory(),
		register: (options, component) => {
			registered.push({ options, component })
			return { dispose: () => {} }
		},
	},
	remote: { account },
	sessions,
	effect: (factory) => {
		factory()
	},
}
//#endregion

//#region load the bundle
let factory = null
const loaderWindow = {
	...window_,
	__ModuleLoader__: {
		load: (entry) => {
			factory = entry.factory
		},
	},
}
const requireStub = (request) => {
	if (request === 'react') return react
	throw new Error('unexpected require: ' + request)
}
new Function('window', 'document', 'require', source)(loaderWindow, document_, requireStub)
assert.ok(factory !== null, 'the bundle registered a factory')

const plugin = factory(requireStub)
assert.deepEqual(plugin.inject, ['slots', 'locale', 'remote', 'remote.account', 'sessions'])
plugin.apply(ctx)

const card = registered.find((entry) => entry.options.name === 'sidebar.footer.action')
assert.ok(card !== undefined, 'registered into sidebar.footer.action')
assert.equal(card.options.id, 'usage-card')
assert.equal(card.options.locale, 'usage-card')

const copy = {
	title: '用量',
	balance: '余额',
	month: '本月',
	today: '今日',
	loading: '加载中…',
	input: '输入',
	output: '输出',
	cache: '缓存',
	usage: '账单',
	topUp: '充值',
	refresh: '刷新',
	context: '上下文',
	approx: '≈',
}
const props = { wide: true, t: (key) => copy[key] ?? key }
const first = flatten(card.component(props))
assert.match(first, /用量/, 'title renders')
assert.match(first, /加载中/, 'loading state renders')

await new Promise((resolve) => setTimeout(resolve, 100))
await new Promise((resolve) => setTimeout(resolve, 100))

const second = flatten(card.component(props))
console.log('--- first paint ---\n' + first)
console.log('--- settled paint ---\n' + second)

// Only the current-month session is read, and the totals land on the card.
assert.deepEqual(reads, ['recent'], "only this month's sessions are read")
assert.match(second, /¥12\.34/, 'balance renders with its currency')
assert.match(second, /\+¥2\.00/, 'bonus wallet renders as a pill')
assert.match(second, /5,600/, 'month total renders (1,000 in + 100 cache-write + 500 out + 4,000 cache read)')
assert.match(second, /今日 5,600/, 'today total renders')
assert.match(second, /缓存 78%/, 'cache hit rate renders (4,000 cache read over 5,100 prompt tokens)')
// 1,100 prompt × 2 + 4,000 cache read × 0.04 + 500 output × 8, per million CNY.
assert.match(second, /≈¥0\.01/, 'monthly cost renders from the published rate table')
assert.match(second, /上下文/, 'context row renders for the selected session')
assert.match(second, /62%/, 'context occupancy is projectedTokens over the window')

// A second refresh reuses the cache: nothing is re-read while updatedAt holds.
await card.component(props)
const before = reads.length
await new Promise((resolve) => setTimeout(resolve, 50))
card.component(props)
assert.equal(reads.length, before, 'cached sessions are not re-read')

// The rail variant renders a button, not the card.
const rail = card.component({ ...props, wide: false })
assert.equal(rail.type, 'button')

console.log('\nOK: usage card bundle behaves as expected')
