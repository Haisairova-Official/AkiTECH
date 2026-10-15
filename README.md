# 秋月电子 · AkiTECH

秋月重工私营网络安全顾问与系统承包商。以秋月为核心的多人工作室，为个人、学校与小型企业提供技术解决方案与工程实施。

纯静态网站，仅使用 HTML、CSS、JavaScript 和 SVG。无需 Python、Node.js、数据库或构建步骤。

## GitHub Pages 部署

本仓库已完成 GitHub Pages 首次部署，并沿用现有自定义域名：

**http://akitech.akiacg.com/**

向 `main` 推送 `dist/` 的修改即可自动更新网站。也可在 **Actions → Deploy static website to GitHub Pages → Run workflow** 手动发布。

若复制到其他仓库，首次在 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**，再手动运行工作流即可。未绑定域名时，默认地址为 `https://用户名.github.io/仓库名/`。

工作流位于 `.github/workflows/pages.yml`，直接将 `dist/` 上传到 GitHub Pages，不安装依赖、不编译网站。资源使用相对路径，兼容 `/AkiTECH/` 子目录。

## 本地查看与其他静态托管

下载仓库后，可直接用浏览器打开 `dist/index.html` 查看页面。也可以将 `dist/` 内的全部文件上传到任意静态网站根目录。

## 页面与交互

- 原版 Logo 随滚动放大，聚焦双同心圆，再逐项引出六类业务。
- 业务节点可点击跳转并展开服务详情；反向滚动可收回动画。
- Canvas 工程场景展示设备配置、网络设计和机架实施。
- 移动端适配、键盘导航、减少动态效果及动效暂停支持。
- 服务详情、受众场景、法律声明与隐私说明。

## 文件

| 文件 | 用途 |
| --- | --- |
| `dist/index.html` | 页面结构、文案与法律声明 |
| `dist/styles.css` | 视觉样式与响应式布局 |
| `dist/intro.js` | Logo、双环及业务分支滚动动画 |
| `dist/workbench.js` | Canvas 工程场景与交互 |
| `dist/app.js` | 导航、选项卡和动效偏好 |
| `dist/assets/` | 品牌标志与图形素材 |
| `README.txt` | 版本及使用说明 |

设备插画为通用概念造型，不代表自有硬件产品、真实项目案例或厂商合作。当前未设置联系页面、提交表单或第三方统计；仅在浏览器本地保存动效偏好。
