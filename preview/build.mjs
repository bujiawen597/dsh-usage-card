/**
 * Build a static preview of the usage card from the real bundle and the real
 * app stylesheet, so the card's geometry can be reviewed without opening the
 * GUI.
 *
 *   node preview/build.mjs   ->  preview/card.html
 *
 * `DSH_APP_CSS` may name the app stylesheet as a file URL.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const bundle = readFileSync(path.join(here, '..', 'lib', 'client.js'), 'utf8')

// Pull the card's stylesheet out of the bundle so the preview cannot drift.
const start = bundle.indexOf('const css = `')
const end = bundle.indexOf('`;', start)
if (start < 0 || end < 0) throw new Error('card stylesheet not found in lib/client.js')
const cardCss = bundle.slice(start + 'const css = `'.length, end)

const appCss = process.env.DSH_APP_CSS ?? ''
const appStyles = appCss === '' ? '' : `<link rel="stylesheet" href="${appCss}">`

const REFRESH =
	'<svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M13.2 8a5.2 5.2 0 1 1-1.62-3.77M13.4 2.6v3.2h-3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const BOLT =
	'<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M9 1.5 3.5 9h3.2L6.6 14.5 12.5 7H9.2L9 1.5Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>'

/** One card instance, mirroring what `UsageCard` renders when wide. */
const card = ({ balance = '—', month = '—', cost = null, sub = '', context = null, today = '今日 —', accent = '' }) => {
	const stack = `<span class="dsu-stack"><span class="dsu-value dsu-mono">${
		month === '—' ? '—' : month + '<span class="dsu-unit">tokens</span>'
	}</span>${cost === null ? '' : `<span class="dsu-cost">≈${cost}</span>`}</span>`
	const tone = context === null ? '' : context >= 80 ? ' dsu-bar-danger' : context >= 60 ? ' dsu-bar-warn' : ''
	const occupancy =
		context === null
			? ''
			: `<div class="dsu-context"><div class="dsu-row"><span class="dsu-label">上下文</span>
      <span class="dsu-value dsu-mono${context >= 60 ? ' dsu-warn' : ''}">${context}%</span></div>
      <div class="dsu-bar${tone}"><span class="dsu-bar-fill" style="width:${Math.max(2, context)}%"></span></div></div>`
	return `<div class="dsu-card">
    <div class="dsu-head"><span class="dsu-title">用量</span>
      <button type="button" class="dsu-refresh" title="刷新">${REFRESH}</button></div>
    <div class="dsu-row"><span class="dsu-label">余额</span>
      <span class="dsu-value ${accent}">${balance}</span></div>
    <div class="dsu-row"><span class="dsu-label">本月</span>${stack}</div>
    ${sub === '' ? '' : `<div class="dsu-sub">${sub}</div>`}
    ${occupancy}
    <div class="dsu-foot"><span class="dsu-today">${today}</span>
      <span class="dsu-actions"><button class="dsu-link">账单 ↗</button><button class="dsu-link">充值</button></span></div>
  </div>`
}

const sessions = ['连接 Lark 国际版', '连接测试', '广告数据概览 · 排查首屏报错']
	.map(
		(title, index) => `<div class="sess${index === 0 ? ' active' : ''}"><span class="dot"></span>
      <span class="sess-title">${title}</span><span class="sess-time">${['9 分钟', '24 分钟', '1 小时'][index]}</span></div>`,
	)
	.join('')

/** The sidebar shell geometry the card sits in. */
const shell = (body, rail = false) => `<div class="shell${rail ? ' collapsed' : ''}">
  <div class="logoRow"><span class="brand">DeepSeek Harness</span><span class="icon-btn">▤</span></div>
  <button class="newSession">＋ 新会话</button>
  ${rail ? '' : `<div class="region">${sessions}</div>`}
  <div class="foot">
    <div class="footerActions">${body}</div>
    <div class="settingsArea"><span class="avatar">👤</span><span class="user">黑大帅</span></div>
  </div>
</div>`

const page = `<!doctype html>
<html lang="zh">
<head><meta charset="utf-8">${appStyles}
<style>
*{box-sizing:border-box}
body{margin:0;background:var(--dsw-alias-bg-base,#f7f7f8);font-family:"Segoe UI","Microsoft YaHei",system-ui,sans-serif;color:var(--dsw-alias-label-primary,#1c1c1e);display:flex;gap:18px;padding:18px;align-items:flex-start}
.shell{width:260px;height:520px;padding:6px 8px;display:flex;flex-direction:column;background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-base,#fbfbfc));border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:12px;font-size:14px}
.shell.collapsed{width:56px;padding:6px 10px;align-items:center}
.logoRow{display:flex;align-items:center;justify-content:space-between;height:44px;flex:none}
.brand{font-size:15px;font-weight:600}
.icon-btn{color:var(--dsw-alias-label-secondary,#8a8a8a)}
.newSession{height:34px;margin:0 3px 10px;border:.5px solid var(--dsw-alias-border-l3,rgba(0,0,0,.14));border-radius:8px;background:var(--dsw-alias-button-elevated-fill,rgba(0,0,0,.03));color:inherit;font:inherit;font-size:13px}
.collapsed .brand,.collapsed .icon-btn{display:none}
.collapsed .newSession{width:36px;height:36px;font-size:0;padding:0}
.region{flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:1px;margin-left:-4px;padding-left:4px}
.sess{display:flex;align-items:center;gap:6px;padding:7px 9px;border-radius:8px;font-size:13px;color:var(--dsw-alias-label-primary,#222)}
.sess.active{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}
.dot{width:6px;height:6px;border-radius:50%;border:1px solid var(--dsw-alias-label-tertiary,#bbb);flex:none}
.sess-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sess-time{color:var(--dsw-alias-label-tertiary,#a0a0a0);font-size:11px}
.foot{flex:none;display:flex;flex-direction:column}
.footerActions{width:100%;display:flex}
.settingsArea{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;font-size:13px}
.collapsed .settingsArea{justify-content:center;padding:0;height:36px;width:36px}
.collapsed .user{display:none}
.collapsed .footerActions{justify-content:center;width:auto}
.avatar{width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}
.user{font-weight:500}
.caption{font-size:12px;color:#9aa0a6;margin:6px 0 0}
.column{display:flex;flex-direction:column;gap:8px}
${cardCss}
</style></head>
<body>
<div class="column">
  <div>${shell(
		card({
			balance: '¥ 12.34<span class="dsu-pill">+¥2.00</span>',
			month: '1.1亿',
			cost: '¥9.91',
			sub: '输入 59.1万 · 输出 54.9万 · 缓存 99%',
			context: 62,
			today: '今日 1.8万 · ≈¥0.62',
		}),
	)}</div>
  <p class="caption">宽栏 · 正常（示例数据）</p>
</div>
<div class="column">
  <div>${shell(
		card({
			balance: '¥ 1.20',
			month: '1.2亿',
			cost: '¥118.6',
			sub: '输入 624万 · 输出 112万 · 缓存 95%',
			context: 87,
			today: '今日 124万 · ≈¥5.2',
			accent: 'dsu-warn',
		}),
	)}</div>
  <p class="caption">宽栏 · 余额偏低、上下文将满</p>
</div>
<div class="column">
  <div>${shell(card({ balance: '—', month: '—', today: '今日 —' }))}</div>
  <p class="caption">宽栏 · 未登录 / 读不到数据</p>
</div>
<div class="column">
  <div>${shell(`<button class="dsu-rail" title="用量">${BOLT}</button>`, true)}</div>
  <p class="caption">收起态</p>
</div>
</body></html>`

writeFileSync(path.join(here, 'card.html'), page, 'utf8')
console.log('wrote preview/card.html')
