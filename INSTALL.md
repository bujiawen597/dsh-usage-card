# 装到另一台电脑（家用 PC）

插件本身是**纯文件**：没有构建步骤、没有运行时依赖、不联网。所以搬过去只有「怎么让那台 DSH 认得它」这一件事。

前提：那台机器装了 DSH（Desktop 版最省事）。客户端用到的槽位与投影接口来自 0.2.2 这一代，版本差太远可能不出现（卡片不渲染，但不会弄坏别的）。

---

## 方案 A（推荐）：拷 `.tgz`，从「路径」安装

产物：`dsh-usage-card-0.1.0.tgz`（在 `plugins/` 下，和插件目录同级）。

1. 把 tgz 拷到家用电脑一个不会被挪动的位置，例如 `C:\Users\<你>\.dsh\plugins\dsh-usage-card-0.1.0.tgz`。
2. 在那台 DSH 里打开左侧 **Plugins** 页 → **Add plugin** → 填这个 tgz 的**绝对路径** → 安装并启用。
3. 侧边栏底部（账号行上方）出现卡片；没出现就 `Ctrl+R` 刷一次页面。

为什么推荐：包会被**复制**进那台的配置档（`~/.dsh/profiles/desktop/node_modules/`），之后删 tgz、挪目录都不影响已装版本。
升级 = 打新 tgz → 再装一次（版本号变了就会替换）。

打包命令（在插件目录里）：

```powershell
pnpm pack --pack-destination <目标目录>
```

## 方案 B：拷整个目录，从目录安装（link）

1. 把整个 `dsh-usage-card` 文件夹拷过去，放到一个长期不动的路径，例如 `D:\dsh-plugins\dsh-usage-card`。
2. Plugins → Add plugin → 填**文件夹**绝对路径。
3. 以后改代码只需在这个目录里改，然后关/开一次插件（或重启 DSH）即可生效，不用重装。

⚠️ **这里有坑，我自己刚踩过**：link 安装时 `node_modules/<包名>` 是指向源目录的 junction。**移除插件时 pnpm 会顺着 junction 把源目录一起清空**。所以用这条路就不要随手「移除插件」，或者移除前先把整个目录备份一份。

## 方案 C：Git 仓库 / npm（多机长期同步）

- **本仓库**：<https://github.com/bujiawen597/dsh-usage-card>（private）
  那台机器先 `gh auth login`（或用带 token 的 https URL），然后在 Plugins → Add plugin 里填
  `git+https://github.com/bujiawen597/dsh-usage-card.git`。
  以后要升级：Plugins 里移除再装一次，拿到最新提交。
- **npm**：`npm publish` 之后在那台机器装 `dsh-usage-card@0.1.0`，一条命令对齐两台版本；代价是包公开、且每次改价要发版。

适合「以后还要改它、并且想两台电脑一直一致」的情况。

> 注意：本机没装 git，仓库是直接走 GitHub API 建的，历史和日常 `git clone` 用法一样。

---

## 装好后怎么确认

- Plugins 页里能看到 `dsh-usage-card`，开关是开的；
- 侧边栏底部出现卡片：余额 / 本月 tokens / ≈¥ / 上下文水位 / 今日；
- 余额那行要求那台电脑登录过 DeepSeek 账号（`deepseek-account`）。如果只用 API key，余额显示 `—`，token 与费用统计照常工作。

## 两台机器的数据是各算各的

卡片读的是**本机** `~/.dsh/sessions` 的会话投影，缓存也写在本机浏览器的 localStorage。所以家里电脑显示的是家里那台的用量，不会把这台的数字同步过去。余额是账号级的，两台会一致（都来自平台）。

## 改价 / 改文案

- 单价：`lib/client.js` 顶部的 `PRICING` 表。
- 预警阈值：余额 `< 10` 琥珀 / `< 2` 红。
- 文案：同文件里的 `TEXT`（zh / en 两份字典）。
- 自检：`node --check lib/client.js` 和 `node test/smoke.mjs`（后者不需要浏览器和 DSH）。
