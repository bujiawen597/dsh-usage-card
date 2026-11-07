/**
 * Sidebar usage card — browser half.
 *
 * Registers one `sidebar.footer.action` occupant: a compact card that sits at
 * the bottom of the sidebar, directly above the account row, and answers the two
 * questions a metered account actually has while working:
 *
 * - how much money is left (DeepSeek Platform wallets, plus bonus wallets), and
 * - how many tokens this month and today have consumed.
 *
 * Data sources are the existing Host contracts; the card owns no state of its
 * own:
 * - `remote.account.getState()` / `getBalance()` for the signed-in state,
 *   wallets and the Platform usage / top-up links.
 * - Session projections (`tokenUsage`) read per Session through
 *   `sessions.refreshProjections()`, which reads the projection cache without
 *   opening a conversation. Totals are cached per Session in `localStorage`,
 *   keyed by the Session's `updatedAt`, so a refresh only re-reads Sessions that
 *   actually changed.
 *
 * Attribution: a Session belongs to the month (and day) of its last activity.
 * A Session carried across a month boundary contributes its whole total to the
 * month it was last used in, so the figure is an upper bound for such a Session.
 */

window.__ModuleLoader__.load({
	id: "dsh-usage-card",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const React = require("react");
		const h = React.createElement;

		//#region styles
		const css = `
.dsu-card{box-sizing:border-box;flex:1 1 0;min-width:0;margin:2px 3px 8px;padding:9px 10px 8px;border:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.22));border-radius:var(--dsw-radius-md,10px);background:var(--dsw-alias-button-elevated-fill,rgba(127,127,127,.06));color:var(--dsw-alias-label-primary,inherit);font-size:12px;line-height:1.4;display:flex;flex-direction:column;gap:2px;position:relative}
.dsu-head{align-items:center;justify-content:space-between;display:flex;margin-bottom:2px}
.dsu-title{color:var(--dsw-alias-label-secondary,#8a8a8a);font-size:10.5px;letter-spacing:.06em}
.dsu-refresh{align-items:center;justify-content:center;display:inline-flex;width:16px;height:16px;padding:0;border:none;border-radius:4px;background:0 0;color:var(--dsw-alias-label-tertiary,#a0a0a0);cursor:pointer;opacity:0;transition:opacity .12s ease}
.dsu-card:hover .dsu-refresh,.dsu-refresh:focus-visible{opacity:1}
.dsu-refresh:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,inherit)}
.dsu-refresh.dsu-spin svg{animation:dsu-spin 1s linear infinite}
@keyframes dsu-spin{to{transform:rotate(360deg)}}
.dsu-row{align-items:baseline;justify-content:space-between;gap:8px;display:flex;min-width:0}
.dsu-label{color:var(--dsw-alias-label-secondary,#8a8a8a);font-size:11px;flex:none}
.dsu-value{font-variant-numeric:tabular-nums;font-weight:600;font-size:12.5px;white-space:nowrap}
.dsu-value.dsu-mono{font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;letter-spacing:-.01em}
.dsu-unit{color:var(--dsw-alias-label-tertiary,#a0a0a0);font-size:10px;font-weight:400;margin-left:2px}
.dsu-sub{color:var(--dsw-alias-label-tertiary,#a0a0a0);font-size:10.5px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsu-stack{display:flex;flex-direction:column;align-items:flex-end;gap:0;min-width:0}
.dsu-cost{color:var(--dsw-alias-label-tertiary,#a0a0a0);font-size:10px;font-variant-numeric:tabular-nums;white-space:nowrap}
.dsu-context{display:flex;flex-direction:column;gap:3px;margin-top:2px}
.dsu-bar{height:3px;border-radius:2px;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.16));overflow:hidden}
.dsu-bar-fill{display:block;height:100%;border-radius:2px;background:var(--dsw-alias-state-business-primary,#4d6bfe);transition:width .3s var(--ds-ease-in-out,ease)}
.dsu-bar-warn .dsu-bar-fill{background:#d98324}
.dsu-bar-danger .dsu-bar-fill{background:#e5484d}
.dsu-foot{align-items:center;justify-content:space-between;display:flex;margin-top:4px;padding-top:5px;border-top:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.18));gap:6px}
.dsu-today{color:var(--dsw-alias-label-tertiary,#a0a0a0);font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dsu-actions{display:flex;gap:8px;flex:none}
.dsu-link{border:none;background:0 0;padding:0;cursor:pointer;color:var(--dsw-alias-label-secondary,#8a8a8a);font-size:10.5px;font-family:inherit}
.dsu-link:hover{color:var(--dsw-alias-state-business-primary,#4d6bfe)}
.dsu-pill{margin-left:4px;padding:0 4px;border-radius:4px;background:var(--dsw-alias-state-business-primary,rgba(77,107,254,.14));color:var(--dsw-alias-state-business-primary,#4d6bfe);font-size:9.5px;font-weight:500}
.dsu-warn{color:#d98324}
.dsu-danger{color:#e5484d}
.dsu-muted{color:var(--dsw-alias-label-tertiary,#a0a0a0);font-weight:500}
.dsu-rail{align-items:center;justify-content:center;display:flex;width:36px;height:36px;margin-bottom:6px;padding:0;border:none;border-radius:var(--dsw-radius-md,10px);background:0 0;color:var(--dsw-alias-label-secondary,#8a8a8a);cursor:pointer;position:relative}
.dsu-rail:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));color:var(--dsw-alias-label-primary,inherit)}
.dsu-dot{position:absolute;top:7px;right:8px;width:5px;height:5px;border-radius:50%;background:#e5484d}
`;
		const tagId = "dsh-usage-card/UsageCard.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-usage-card";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region copy
		const NS = "usage-card";
		const TEXT = {
			en: {
				title: "USAGE",
				balance: "Balance",
				month: "This month",
				today: "Today",
				refresh: "Refresh",
				usage: "Billing",
				topUp: "Top up",
				bonus: "bonus",
				tokens: "tokens",
				input: "in",
				output: "out",
				cache: "cache",
				sessions: "sessions",
				loading: "loading…",
				noAccount: "not signed in",
				approx: "≈",
				context: "Context",
				contextHint: "How full this conversation is: the size the next request would reach over the model window. Compaction is what reacts to it.",
				costBasis: "Estimate at DeepSeek peak rates (CNY per 1M: cache hit 0.04, miss 2, output 8); off-peak is half price.",
				costPartial: "Some sessions could not be priced and are left out.",
				costUnpriced: "No published rate for this model, so no cost is shown.",
				monthHint: "Sessions last used this month; a session carried across a month boundary counts in full here.",
			},
			zh: {
				title: "用量",
				balance: "余额",
				month: "本月",
				today: "今日",
				refresh: "刷新",
				usage: "账单",
				topUp: "充值",
				bonus: "赠送",
				tokens: "tokens",
				input: "输入",
				output: "输出",
				cache: "缓存",
				sessions: "会话",
				loading: "加载中…",
				noAccount: "未登录",
				approx: "≈",
				context: "上下文",
				contextHint: "当前会话的水位：下一次请求预计占模型窗口的比例，压缩（compaction）就是按它触发的。",
				costBasis: "按 DeepSeek 峰时单价估算（元/百万：缓存命中 0.04、未命中 2、输出 8），谷时五折。",
				costPartial: "部分会话没有可用的单价，未计入。",
				costUnpriced: "这个模型没有公开单价，不计金额。",
				monthHint: "按会话最后活跃时间归属；跨月会话的整段消耗都算作本月。",
			},
		};
		//#endregion

		//#region formatting
		/** Number of a possibly-missing figure, never NaN. */
		function num(value) {
			return typeof value === "number" && Number.isFinite(value) ? value : 0;
		}

		/** Thousands-separated integer. */
		function group(value) {
			return Math.round(num(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		}

		/** One decimal at most, dropping a trailing `.0`. */
		function trim(value) {
			const rounded = value >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
			return String(rounded);
		}

		/** Compact token count; Chinese unit words for `zh`, K/M/B otherwise. */
		function compactTokens(value, lang) {
			if (!Number.isFinite(value) || value <= 0) return "0";
			if (lang === "zh") {
				if (value < 1e4) return group(value);
				if (value < 1e8) return trim(value / 1e4) + "万";
				return trim(value / 1e8) + "亿";
			}
			if (value < 1e3) return group(value);
			if (value < 1e6) return trim(value / 1e3) + "K";
			if (value < 1e9) return trim(value / 1e6) + "M";
			return trim(value / 1e9) + "B";
		}

		/** Wallet amount with its currency mark. */
		function money(amount, currency) {
			const symbol = currency === "USD" ? "$" : "¥";
			if (!Number.isFinite(amount)) return symbol + "—";
			const fixed = Math.abs(amount) >= 1000 ? group(amount) : amount.toFixed(2);
			return symbol + fixed;
		}

		/** Local calendar start of the current month, in milliseconds. */
		function startOfMonth(now) {
			const start = new Date(now);
			return new Date(start.getFullYear(), start.getMonth(), 1).getTime();
		}

		/** Local calendar start of today, in milliseconds. */
		function startOfDay(now) {
			const start = new Date(now);
			return new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
		}
		//#endregion

		//#region per-session token totals
		const CACHE_KEY = "dsh-usage-card/cache:v2";

		/** Read the per-Session token cache; a corrupt or absent value reads as empty. */
		function readCache() {
			try {
				const parsed = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? "null");
				if (parsed === null || typeof parsed !== "object" || typeof parsed.sessions !== "object" || parsed.sessions === null) return { sessions: {} };
				return { sessions: parsed.sessions };
			} catch {
				return { sessions: {} };
			}
		}

		/** Persist the per-Session token cache; storage failures are not a card failure. */
		function writeCache(value) {
			try {
				window.localStorage.setItem(CACHE_KEY, JSON.stringify(value));
			} catch {
				/* private mode, quota, disabled storage: the card still works in memory */
			}
		}

		/**
		 * One Session's token buckets and the route it was billed on, or null when
		 * the Session reports no usage.
		 *
		 * The `tokenUsage` client view is the flattened totals object (the Host
		 * projection's view is `state => state.totals`), so both the flat value and
		 * a nested `totals` are accepted.
		 *
		 * @param snapshot - the Session list snapshot.
		 * @param sessionId - Session to read.
		 * @returns prompt/output/cache buckets plus model and provider, when known.
		 */
		function tokenTotals(snapshot, sessionId) {
			const values = snapshot?.projectionsBySession?.[sessionId]?.values;
			const usage = values?.tokenUsage;
			if (usage === null || typeof usage !== "object") return null;
			const totals = usage.totals ?? usage;
			if (totals === null || typeof totals !== "object") return null;
			const input = num(totals.uncachedInputTokens) + num(totals.cacheWriteTokens);
			const output = num(totals.outputTokens);
			const cacheRead = num(totals.cacheReadTokens);
			const route = values?.modelSelection?.lastUsed ?? null;
			return {
				input,
				output,
				cacheRead,
				total: input + output + cacheRead,
				model: typeof route?.model === "string" ? route.model : null,
				provider: typeof route?.provider === "string" ? route.provider : null,
			};
		}
		//#endregion

		//#region pricing
		/**
		 * CNY per million tokens, from DeepSeek's Models & Pricing page (checked
		 * 2026-10). These are **peak** rates: off-peak hours are half price, so this
		 * estimate is an upper bound. Edit this table when prices change; an unknown
		 * model is never priced rather than guessed.
		 */
		const PRICING = {
			"deepseek-flash": { hit: 0.04, miss: 2, output: 8 },
			"deepseek-v4-pro": { hit: 0.3, miss: 9, output: 27 },
		};
		/** Legacy model names that the official page prices as Flash. */
		const PRICING_ALIASES = {
			"deepseek-v4-flash": "deepseek-flash",
			"deepseek-v4-flash-vision-exp": "deepseek-flash",
		};

		/**
		 * Price one Session's buckets, or null when its route is not a DeepSeek
		 * official one or its model has no published rate.
		 *
		 * @param entry - cached buckets with `m` (model) and `p` (provider).
		 * @returns cost in CNY, or null when the Session cannot be priced.
		 */
		function costOf(entry) {
			if (entry === null || typeof entry !== "object") return null;
			const provider = typeof entry.p === "string" ? entry.p : "";
			if (!provider.startsWith("deepseek")) return null;
			const model = typeof entry.m === "string" ? entry.m : "";
			const rate = PRICING[PRICING_ALIASES[model] ?? model];
			if (rate === undefined) return null;
			return (num(entry.i) * rate.miss + num(entry.r) * rate.hit + num(entry.o) * rate.output) / 1e6;
		}
		//#endregion

		//#region usage aggregation
		/**
		 * Sum this month's and today's token consumption.
		 *
		 * Only Sessions last used this month are read; their projection cache
		 * entries are reused while `updatedAt` is unchanged, so a refresh costs one
		 * Remote read per Session that actually moved.
		 *
		 * @param sessions - the client Session service (`ctx.sessions`).
		 * @param now - clock used for the month and day boundaries.
		 * @returns month totals, today's total, and how many Sessions contributed.
		 */
		async function readUsage(sessions, now) {
			const list = sessions?.list;
			if (list === undefined || typeof list.getSnapshot !== "function" || typeof sessions.refreshProjections !== "function") return null;
			const snapshot = list.getSnapshot();
			if (snapshot === undefined || !Array.isArray(snapshot.ids) || snapshot.phase !== "ready") return null;
			const monthStart = startOfMonth(now);
			const dayStart = startOfDay(now);
			const rows = [];
			for (const id of snapshot.ids) {
				const row = snapshot.byId?.[id];
				if (row === undefined || num(row.updatedAt) < monthStart) continue;
				rows.push(row);
			}
			const cache = readCache();
			const next = { sessions: {} };
			const pending = [];
			for (const row of rows) {
				const cached = cache.sessions[row.id];
				// A cached figure is reused only while the Session is unchanged *and*
				// it carries the route: an entry without a model cannot be priced, so
				// it is re-read once instead of being trusted forever.
				const fresh = cached !== undefined && cached.u === row.updatedAt && Number.isFinite(cached.t) && typeof cached.m === "string";
				if (fresh) next.sessions[row.id] = cached;
				else pending.push(row);
			}
			let cursor = 0;
			const worker = async () => {
				while (cursor < pending.length) {
					const row = pending[cursor++];
					try {
						await sessions.refreshProjections(row.id);
					} catch {
						/* keep the cached figure when the read fails */
					}
					const totals = tokenTotals(list.getSnapshot(), row.id);
					if (totals !== null) {
						next.sessions[row.id] = {
							u: row.updatedAt,
							t: totals.total,
							i: totals.input,
							o: totals.output,
							r: totals.cacheRead,
							...totals.model === null ? {} : { m: totals.model },
							...totals.provider === null ? {} : { p: totals.provider },
						};
					}
				}
			};
			await Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker));
			if (pending.length > 0) writeCache(next);

			let total = 0;
			let input = 0;
			let output = 0;
			let cacheRead = 0;
			let today = 0;
			let counted = 0;
			let cost = 0;
			let priced = 0;
			for (const row of rows) {
				const entry = next.sessions[row.id];
				if (entry === undefined) continue;
				counted += 1;
				total += num(entry.t);
				input += num(entry.i);
				output += num(entry.o);
				cacheRead += num(entry.r);
				if (num(row.updatedAt) >= dayStart) today += num(entry.t);
				const sessionCost = costOf(entry);
				if (sessionCost !== null) {
					cost += sessionCost;
					priced += 1;
				}
			}
			const prompt = input + cacheRead;
			return {
				month: total,
				input,
				output,
				cacheRead,
				cacheHitRate: prompt > 0 ? cacheRead / prompt : null,
				today,
				todayCost: todayCostOf(rows, next, dayStart),
				sessions: counted,
				cost: priced === 0 ? null : cost,
				unpriced: counted - priced,
				monthStart,
				readAt: now,
			};
		}

		/**
		 * Price the Sessions that moved today, for the foot line.
		 * @param rows - this month's Session rows.
		 * @param next - the cache being written.
		 * @param dayStart - local start of today.
		 * @returns today's cost in CNY, or null when none of them can be priced.
		 */
		function todayCostOf(rows, next, dayStart) {
			let cost = 0;
			let seen = 0;
			for (const row of rows) {
				if (num(row.updatedAt) < dayStart) continue;
				const entry = next.sessions[row.id];
				if (entry === undefined) continue;
				const sessionCost = costOf(entry);
				if (sessionCost === null) continue;
				cost += sessionCost;
				seen += 1;
			}
			return seen === 0 ? null : cost;
		}
		//#endregion

		//#region context occupancy
		/**
		 * The Session the main view currently holds, read from the browser-persisted
		 * selection the workspace store writes (`dsh.sessions.current`). It is a
		 * plain value, not a service: an absent or reshaped entry just hides the
		 * context bar.
		 *
		 * @returns the selected Session id, or null.
		 */
		function currentSessionId() {
			try {
				const raw = window.localStorage.getItem("dsh.sessions.current");
				if (raw === null || raw.length === 0) return null;
				const parsed = JSON.parse(raw);
				const id = parsed?.sessionId ?? parsed?.value?.sessionId ?? null;
				return typeof id === "string" && id.length > 0 ? id : null;
			} catch {
				return null;
			}
		}

		/**
		 * Context occupancy of the Session in the main view.
		 *
		 * The `contextPressure` client view carries the window, the provider's
		 * pressure sample, and `projectedTokens` — the size the next request would
		 * reach. `projectedTokens` is what compaction reacts to, so it is the
		 * honest numerator for a "how full is this conversation" bar.
		 *
		 * @param sessions - the client Session service.
		 * @param list - the Session list snapshot source.
		 * @returns occupancy, or null while no Session is open or it reports none.
		 */
		async function readContext(sessions, list) {
			const sessionId = currentSessionId();
			if (sessionId === null) return null;
			const at = () => list.getSnapshot()?.projectionsBySession?.[sessionId]?.values?.contextPressure ?? null;
			let pressure = at();
			if (pressure === null && typeof sessions.refreshProjections === "function") {
				try {
					await sessions.refreshProjections(sessionId);
				} catch {
					/* no projection read: the bar stays hidden */
				}
				pressure = at();
			}
			if (pressure === null || typeof pressure !== "object") return null;
			const window = num(pressure.contextWindow);
			const used = num(pressure.projectedTokens ?? pressure.pressureTokens);
			if (window <= 0 || used <= 0) return null;
			return { sessionId, used, window, ratio: Math.min(1, used / window) };
		}
		//#endregion

		//#region account
		/** Host release identity reported to Platform; cosmetic, so a missing one is harmless. */
		function buildVersion() {
			try {
				const boot = globalThis.__DSH_BOOT__;
				const version = boot?.version ?? boot?.release?.version ?? boot?.release;
				return typeof version === "string" ? version : "0.0.0";
			} catch {
				return "0.0.0";
			}
		}

		/** The requesting-UI identity every account operation carries. */
		function clientMetadata(ctx) {
			return {
				version: buildVersion(),
				locale: ctx.locale?.getSnapshot?.().active ?? "en",
				timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60,
			};
		}

		/**
		 * Read the signed-in state, its Platform links, and the wallet balances.
		 *
		 * `watch`/`getState` separate "not signed in" from "signed in", and the
		 * balance query is skipped entirely while signed out so a signed-out card
		 * never shows a stale figure.
		 *
		 * @param ctx - the client plugin context.
		 * @returns account facts, or null when the account Remote is unavailable.
		 */
		async function readAccount(ctx) {
			const account = ctx.remote?.account;
			if (account === undefined) return null;
			let view = null;
			try {
				const state = await account.getState();
				view = state?.ok ? state.value : null;
			} catch {
				return null;
			}
			const links = view?.links ?? null;
			if (view?.status !== "credential-stored") return { signedIn: false, links, wallets: [], bonus: [] };
			let wallets = [];
			let bonus = [];
			let failed = false;
			try {
				const result = await account.getBalance(clientMetadata(ctx));
				if (result?.ok && result.value?.status === "ready") {
					wallets = (result.value.value ?? []).map((wallet) => ({ currency: wallet.currency, amount: Number(wallet.balance) }));
					bonus = (result.value.bonusWallets ?? []).map((wallet) => ({ currency: wallet.currency, amount: Number(wallet.balance) }));
				} else if (result?.ok) {
					failed = true;
				}
			} catch {
				failed = true;
			}
			return { signedIn: true, links, wallets, bonus, failed };
		}
		//#endregion

		//#region store
		const REFRESH_MS = 120000;

		/**
		 * One card-wide snapshot with a single in-flight refresh.
		 * @param ctx - the client plugin context.
		 * @param t - bound locale lookup.
		 */
		function createStore(ctx) {
			const listeners = new Set();
			let snapshot = { phase: "loading", account: null, usage: null, context: null, error: null, updatedAt: 0 };
			let running = null;
			const publish = (next) => {
				snapshot = { ...snapshot, ...next };
				for (const listener of listeners) listener();
			};
			const refresh = () => {
				if (running !== null) return running;
				publish({ phase: snapshot.updatedAt === 0 ? "loading" : "refreshing" });
				const task = (async () => {
					const now = Date.now();
					const list = ctx.sessions?.list;
					const [account, usage, context] = await Promise.all([
						readAccount(ctx).catch((error) => {
							console.error("[usage-card] account read failed", error);
							return null;
						}),
						readUsage(ctx.sessions, now).catch((error) => {
							console.error("[usage-card] usage read failed", error);
							return null;
						}),
						readContext(ctx.sessions, list).catch((error) => {
							console.error("[usage-card] context read failed", error);
							return null;
						}),
					]);
					publish({ phase: "ready", account, usage, context, updatedAt: Date.now() });
				})();
				running = task.finally(() => {
					running = null;
				});
				return running;
			};
			return {
				getSnapshot: () => snapshot,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
				refresh,
			};
		}
		//#endregion

		//#region component
		const REFRESH_ICON = h(
			"svg",
			{ width: 11, height: 11, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" },
			h("path", {
				d: "M13.2 8a5.2 5.2 0 1 1-1.62-3.77M13.4 2.6v3.2h-3.2",
				stroke: "currentColor",
				"stroke-width": 1.4,
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
			}),
		);

		const BOLT_ICON = h(
			"svg",
			{ width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" },
			h("path", { d: "M9 1.5 3.5 9h3.2L6.6 14.5 12.5 7H9.2L9 1.5Z", stroke: "currentColor", "stroke-width": 1.2, "stroke-linejoin": "round" }),
		);

		/**
		 * The sidebar card itself: account balance, this month's tokens, today's
		 * tokens, and the two Platform doors (billing detail and top-up).
		 * @param props - `wide` from the sidebar shell, `t` from the locale seat.
		 */
		function UsageCard(props) {
			const wide = props.wide !== false;
			const t = typeof props.t === "function" ? props.t : (key) => TEXT.zh[key] ?? key;
			const store = cardStore;
			const snapshot = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
			const [spinning, setSpinning] = React.useState(false);
			const lang = useLang();
			React.useEffect(() => {
				store.refresh();
			}, []);
			React.useEffect(() => {
				const timer = window.setInterval(() => store.refresh(), REFRESH_MS);
				return () => window.clearInterval(timer);
			}, []);
			const refresh = () => {
				setSpinning(true);
				const done = () => setSpinning(false);
				Promise.resolve(store.refresh()).then(done, done);
			};
			const account = snapshot.account;
			const usage = snapshot.usage;
			const context = snapshot.context;
			const links = account?.links ?? null;
			const open = (url) => {
				if (typeof url === "string" && url.length > 0) window.open(url, "_blank", "noopener,noreferrer");
			};
			const wallet = account?.wallets?.[0] ?? null;
			const bonus = (account?.bonus ?? []).find((candidate) => candidate.currency === wallet?.currency) ?? account?.bonus?.[0] ?? null;
			const low = wallet !== null && Number.isFinite(wallet.amount) ? (wallet.amount < 2 ? "dsu-danger" : wallet.amount < 10 ? "dsu-warn" : "") : "";
			const tokens = usage === null ? null : usage.month;
			const cost = usage?.cost ?? null;

			if (!wide) {
				return h(
					"button",
					{
						type: "button",
						className: "dsu-rail",
						title: t("title") + (usage === null ? "" : " · " + compactTokens(tokens, lang)),
						"aria-label": t("title"),
						onClick: () => open(links?.usageUrl ?? null),
					},
					BOLT_ICON,
					low === "dsu-danger" ? h("span", { className: "dsu-dot" }) : null,
				);
			}

			const balanceText = account === null || account.failed || wallet === null || !account.signedIn ? "—" : money(wallet.amount, wallet.currency);
			const balanceHint = account !== null && account.signedIn === false ? t("noAccount") : wallet === null ? "" : String(wallet.amount) + " " + wallet.currency;
			const breakdown =
				usage === null
					? ""
					: [
							t("input") + " " + compactTokens(usage.input, lang),
							t("output") + " " + compactTokens(usage.output, lang),
							usage.cacheHitRate === null ? null : t("cache") + " " + Math.round(usage.cacheHitRate * 100) + "%",
						]
							.filter((part) => part !== null)
							.join(" · ");
			const costHint =
				usage === null
					? ""
					: [
							t("input") + " " + compactTokens(usage.input, lang),
							t("output") + " " + compactTokens(usage.output, lang),
							t("cache") + " " + compactTokens(usage.cacheRead, lang) + (usage.cacheHitRate === null ? "" : " (" + Math.round(usage.cacheHitRate * 100) + "%)"),
							t("sessions") + " " + usage.sessions,
						].join(" · ") + "\n" + (cost === null ? t("costUnpriced") : t("costBasis") + (usage.unpriced > 0 ? " · " + t("costPartial") : ""));
			const ratio = context === null ? null : context.ratio;
			const barTone = ratio === null ? "" : ratio >= 0.8 ? " dsu-bar-danger" : ratio >= 0.6 ? " dsu-bar-warn" : "";
			return h(
				"div",
				{ className: "dsu-card", "data-usage-card": "" },
				h(
					"div",
					{ className: "dsu-head" },
					h("span", { className: "dsu-title" }, t("title")),
					h(
						"button",
						{
							type: "button",
							className: "dsu-refresh" + (spinning ? " dsu-spin" : ""),
							title: t("refresh"),
							"aria-label": t("refresh"),
							onClick: refresh,
						},
						REFRESH_ICON,
					),
				),
				h(
					"div",
					{ className: "dsu-row" },
					h("span", { className: "dsu-label" }, t("balance")),
					h(
						"span",
						{ className: "dsu-value " + (balanceText === "—" ? "dsu-muted " : "") + low, title: balanceHint },
						balanceText,
						bonus !== null && bonus.amount > 0 ? h("span", { className: "dsu-pill" }, "+" + money(bonus.amount, bonus.currency)) : null,
					),
				),
				h(
					"div",
					{ className: "dsu-row", title: costHint },
					h("span", { className: "dsu-label" }, t("month")),
					h(
						"span",
						{ className: "dsu-stack" },
						h(
							"span",
							{ className: "dsu-value dsu-mono" + (tokens === null ? " dsu-muted" : "") },
							tokens === null ? "—" : compactTokens(tokens, lang),
							tokens === null ? null : h("span", { className: "dsu-unit" }, "tokens"),
						),
						cost === null ? null : h("span", { className: "dsu-cost" }, t("approx") + money(cost, wallet?.currency)),
					),
				),
				usage !== null && usage.month > 0
					? h("div", { className: "dsu-sub", title: breakdown }, breakdown)
					: snapshot.phase === "loading"
						? h("div", { className: "dsu-sub" }, t("loading"))
						: null,
				context === null
					? null
					: h(
							"div",
							{ className: "dsu-context", title: t("contextHint") },
							h(
								"div",
								{ className: "dsu-row" },
								h("span", { className: "dsu-label" }, t("context")),
								h("span", { className: "dsu-value dsu-mono" + (ratio >= 0.8 ? " dsu-danger" : ratio >= 0.6 ? " dsu-warn" : "") }, Math.round(ratio * 100) + "%"),
							),
							h(
								"div",
								{ className: "dsu-bar" + barTone, role: "img", "aria-label": t("context") + " " + Math.round(ratio * 100) + "%" },
								h("span", { className: "dsu-bar-fill", style: { width: Math.max(2, Math.round(ratio * 100)) + "%" } }),
							),
						),
				h(
					"div",
					{ className: "dsu-foot" },
					h(
						"span",
						{ className: "dsu-today" },
						t("today") + " " + (usage === null ? "—" : compactTokens(usage.today, lang)) + (usage?.todayCost === null || usage?.todayCost === undefined ? "" : " · " + t("approx") + money(usage.todayCost, wallet?.currency)),
					),
					h(
						"span",
						{ className: "dsu-actions" },
						links?.usageUrl ? h("button", { type: "button", className: "dsu-link", onClick: () => open(links.usageUrl) }, t("usage") + " ↗") : null,
						links?.topUpUrl ? h("button", { type: "button", className: "dsu-link", onClick: () => open(links.topUpUrl) }, t("topUp")) : null,
					),
				),
			);
		}

		let cardStore = null;
		let activeLang = "zh";

		/** Reactive UI language; keeps compact units in step with the locale. */
		function useLang() {
			const [lang, setLang] = React.useState(activeLang);
			React.useEffect(() => {
				const off = localeListener;
				if (off === null) return undefined;
				const update = () => setLang(activeLang);
				return off(update);
			}, []);
			return lang;
		}

		/** Unsubscribe hook into the locale service, installed by `apply`. */
		let localeListener = null;
		//#endregion

		//#region plugin
		/** Client services the card reads. */
		const inject = ["slots", "locale", "remote", "remote.account", "sessions"];

		/**
		 * Register the card into the sidebar foot.
		 * @param ctx - the client plugin context.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, TEXT), "usage-card: dictionaries");
			const setLang = () => {
				activeLang = String(ctx.locale.getSnapshot().active ?? "en").split("-")[0];
			};
			setLang();
			ctx.effect(
				() =>
					ctx.locale.subscribe?.(() => {
						setLang();
					}),
				"usage-card: language",
			);
			cardStore = createStore(ctx);
			localeListener = (listener) => {
				if (typeof ctx.locale.subscribe !== "function") return () => {};
				return ctx.locale.subscribe(listener);
			};
			ctx.slots.inject("sidebar.footer.action", () =>
				ctx.slots.register(
					{
						name: "sidebar.footer.action",
						id: "usage-card",
						order: 40,
						locale: NS,
					},
					UsageCard,
				),
			);
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	},
});
