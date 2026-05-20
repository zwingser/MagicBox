# MagicBox Design Docs

`google design` 目录已重置为 MagicBox 当前版本的产品与设计文稿。

这里不再保留早期草图、截图切片或历史方案，全部内容都以当前代码实现和现阶段产品方向为准。

## 文档列表

- `Product-Spec.md`：产品定位、目标用户、核心能力、数据模型
- `Information-Architecture.md`：页面结构、导航关系、对象结构
- `Interaction-Design.md`：桌面交互、拖拽、文件夹、固定页、添加与编辑流程
- `Page-Specs.md`：各页面的职责、UI 构成、状态与行为
- `Platform-Strategy.md`：Android / iOS / 微信小程序的运行策略与能力边界

## 当前版本原则

- Android 独立运行体验优先
- iOS 保持可兼容的代码结构
- 微信小程序保留管理能力与受限能力提示，不承诺任意外部网站直开
- 收藏入口统一，支持网页、App Deep Link、小程序链接
- 首页交互以“手机桌面式管理”作为核心体验

## 与早期方案的差异

- 不再以“万能搜索”作为主页能力
- 固定页不再是历史记录页，而是单独的固定访问位
- Dock 结构固定为 `Home 1 / Home 2 / Fixed Page / Settings`，中间 `+` 为浮层入口，不作为独立主页面
- Home 1 与 Home 2 的职责已经分化，不再共用完全相同的头部结构
