# MagicBox 信息架构

## 1. 一级结构

当前应用的主结构由 4 个固定页面加 1 个浮层入口组成。

### Dock 固定入口

- `Home 1`
- `Home 2`
- `+`
- `Fixed Page`
- `Settings`

其中：

- `Home 1 / Home 2 / Fixed Page / Settings` 是主导航
- `+` 是快捷添加入口，不属于独立 tab 页面

## 2. 页面树

```text
MagicBox
├─ Home 1
│  ├─ Recent Banner
│  ├─ Desktop Grid
│  └─ Folder Detail
├─ Home 2
│  ├─ Desktop Grid
│  └─ Folder Detail
├─ Fixed Page
│  ├─ Configured State
│  └─ Empty State
├─ Settings
│  ├─ Theme
│  ├─ Page Names
│  ├─ Fixed Page URL
│  ├─ Export
│  ├─ Import
│  └─ Reset
├─ Add / Edit Sheet
└─ Browser Page
```

## 3. 页面关系

### Home 1 / Home 2

- 是收藏管理主场景
- 图标可直接打开
- 文件夹可进入子页面
- 长按进入管理动作
- 支持拖拽排序与组织

### Folder

- 从桌面中的文件夹进入
- 展示该文件夹内部的收藏项
- 支持打开项
- 支持从文件夹移出到当前桌面
- 支持文件夹重命名

### Fixed Page

- 是一个固定入口页
- 已配置时进入内嵌浏览流程
- 未配置时展示空状态和前往设置的入口

### Browser

- 承担网页内容展示
- 既服务普通网页打开，也服务固定页的内嵌打开

### Settings

- 是全局配置中心
- 同时承担固定页地址配置和数据管理能力

## 4. 导航原则

### 主导航

- 优先通过 Dock 切换主页面
- Home 页之间支持手势切换
- Fixed Page 作为内容入口，不承担全局管理逻辑

### 次级导航

- 文件夹进入二级页面
- 普通网页进入 Browser 页面
- Add / Edit 使用浮层，不插入主导航层级

## 5. 对象关系

```text
desktop
├─ item
├─ item
└─ folder
   ├─ item
   ├─ item
   └─ item
```

规则：

- `item` 只能存在于桌面根层或某个文件夹内
- `folder` 只能存在于桌面根层
- `folder` 当前不支持嵌套文件夹
- `history` 为独立记录流，不参与桌面布局

## 6. 状态归属

### 持久化状态

- 收藏项
- 文件夹
- 桌面顺序
- 历史记录
- 固定页地址
- 主题
- 页面名称

### 临时状态

- 当前拖拽状态
- Add / Edit 浮层开关
- 固定页聚焦引导
- 最近打开轮播当前项

## 7. 结构上的产品结论

MagicBox 当前的信息架构是“固定主导航 + 浮层编辑 + 桌面组织 + 内容打开页”的组合。

这套结构强调的是稳定入口和低认知负担，而不是功能越多越好。
