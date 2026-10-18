# 言衣

说一句，换一身。用中文描述想穿的衣服，言衣从衣橱里挑单品，叠在男装或女装模特身上。

这是纯前端的 V1：不调用付费接口，仓库里也不放任何密钥。打字就能走完主路径；浏览器支持语音时，可以按住麦克风说。

线上地址：[https://xiangshu3721.github.io/voice-tryon/](https://xiangshu3721.github.io/voice-tryon/)

## 可以怎么说

快捷语句一直在输入框上面：来套通勤、换白色、加件外套、约会穿什么、来套休闲、保存这套。

也可以连着说，它会记住上一句在改什么：

1. 「给我搭套裙子」——换成黑色长裙
2. 「白色的呢」——只改颜色，换成白色荷叶边裙
3. 「还是给我来点休闲的」——白短上衣、米色长裤、腰带、运动鞋
4. 「加一件夹克」——在这一身上再叠一件黑皮夹克，不把里面换掉
5. 「好，帮我保存这套」——存进「我的搭配」

男装可以这样说：「来套商务的」→「换成藏青色」→「加件大衣」。西装和西裤跟着变藏青，衬衫还是白的，大衣叠在外面。

其他能听懂的说法：

- 场景：通勤、休闲、约会、运动、正式、商务、度假、冬天、夏天、新中式
- 指定单品：来条牛仔裤、戴顶帽子
- 改颜色：换成蓝的、上衣换红色
- 叠加：加件外套、加一条围巾
- 脱掉：把外套脱了、不要帽子
- 撤销：还是刚才那套
- 随机：随便来一套
- 换模特：换男装、看看女装

听不懂时，会告诉你可以怎么说。衣橱里的单品也能直接点，再点一次脱掉。

这个浏览器听不到你说话时，页面会提示：「这个浏览器听不到你说话，可以打字，或用输入法的语音键」。微信内置浏览器、不少安卓浏览器和 Firefox 会走到这里。输入框始终在。

朗读搭配师的回复默认关着，右上角可以打开。用的是浏览器自带的 `speechSynthesis`。

## 本地开发

```bash
npm install
npm test
npm run dev
```

开发地址是 `http://127.0.0.1:5173/voice-tryon/`。`npm run build` 会先做类型检查再打包，`npm run preview` 预览 `dist`。

可选环境变量只在 `.env.example` 里：

```bash
VITE_STYLIST_API=
```

留空就只用本地规则。不要把模型密钥写进前端或提交到仓库。

## 现在怎么做的

手机竖屏：模特在上，字幕叠在画面下方，衣橱、这一身、我的搭配用标签切换，底部是输入框和麦克风。桌面宽屏改成左右两栏。输入框字号 16px，按钮高度至少 44px。

模特和衣服是手绘的分层 SVG，不是照片。女装、男装各有一套衣橱（每套 30 件以上），颜色用中文颜色词填：黑白灰米蓝红绿粉黄棕，以及藏青、卡其、驼、奶油、燕麦、酒红、橙、紫。叠放顺序是鞋 → 下装或裙子 → 上衣 → 外套 → 大衣 → 配饰。

保存的搭配放在这台浏览器的 `localStorage`，可以再穿上、删除，也可以把当前这一身导出成 PNG（含模特和单品清单）。图片只留在本地，不上传。

## 架构

```text
Frontend
  └─ Product API          /api/stylist   （VITE_STYLIST_API，可空）
       └─ AI Gateway      鉴权、限流、不把厂商密钥交给浏览器
            └─ Model Router
                 └─ Providers   DeepSeek / Qwen / OpenAI 等
```

前端只认识两个接口，不绑定任何模型厂商。

`IntentProvider` 负责把一句话变成换装动作：

- `LocalRuleProvider`：默认。浏览器里的中文规则，解析意图和槽位。
- `GatewayProvider`：`VITE_STYLIST_API` 有值时，POST 到 `{VITE_STYLIST_API}`（按 Product API 的 `/api/stylist` 约定）。请求失败、超时或返回对不上衣橱时，自动退回本地规则。

`TryOnRenderer` 负责把搭配画出来：

- `SvgLayerRenderer`：默认，也就是现在这套插画。
- `PhotoTryOnRenderer`：真人照片试穿的占位。`ACTIVE_TRYON_RENDERER` 仍是 `svg-layers`，改成 `photo-ai` 也只会显示说明，不会偷偷请求外部模型。

## 以后接真人试穿

用户上传一张本人照片，当前搭配作为服装条件，由 Product API 的 `/api/tryon` 交给 AI Gateway，再路由到试衣模型。前端只替换渲染器，衣橱、对话和保存逻辑不动。

可以接的模型，按部署位置选，不在 V1 里调用：

- 国内：阿里云 OutfitAnyone、通义万相虚拟试衣
- 开源、可自托管：IDM-VTON、OOTDiffusion、CatVTON

照片、密钥和推理都放在 Gateway 后面。浏览器仍然不保存厂商密钥。

## 发布

推到 `main` 后，GitHub Actions（`.github/workflows/pages.yml`）会跑测试、构建，并用 GitHub Pages 发布到上面的地址。Pages 的 Source 需要是 GitHub Actions。
