# Pesta — Apple App Store 上架指南

## 技术方案

Pesta 使用 **Capacitor** 将 React Web App 封装为原生 iOS App，无需重写代码。

## 本地开发环境要求

- macOS (必须，iOS 构建只能在 Mac 上进行)
- Xcode 15+ (从 Mac App Store 免费安装)
- Apple Developer Account ($99/年)
- Node.js + pnpm
- iOS Simulator (随 Xcode 安装)

---

## 第一步：准备应用图标

App Store 需要 1024×1024 的源图标（无圆角、无透明度）。

```bash
# 将你的 1024×1024 图标保存到项目根目录，命名为 icon-source.png
# 然后运行：
./scripts/generate-icons.sh icon-source.png
```

这会生成 `public/` 目录下的 Web 图标和 `ios/App/App/Assets.xcassets/AppIcon.appiconset/` 下的 Xcode 图标。

---

## 第二步：构建 Web 资源并同步到 iOS

```bash
# 构建生产版本
pnpm build:prod

# 同步到 iOS 项目
pnpm cap:sync
```

---

## 第三步：在 Xcode 中配置

```bash
# 打开 Xcode 项目
pnpm cap:open:ios
```

在 Xcode 中：
1. 点击左侧 `App` 项目
2. **Signing & Capabilities** 选项卡：
   - Team: 选择你的 Apple Developer 账号
   - Bundle Identifier: `com.pesta.app`
3. **General** 选项卡：
   - Version: 设置版本号，如 `1.0.0`
   - Build: 设置构建号，如 `1`
4. **Info** 选项卡：确认隐私权限描述（相机、相册、NFC）

---

## 第四步：在模拟器上测试

在 Xcode 中选择 iPhone 模拟器，点击 ▶ 运行。

---

## 第五步：Archive 并上传到 App Store

1. Xcode 菜单 → **Product → Archive**
2. 完成后，Organizer 窗口弹出
3. 点击 **Distribute App**
4. 选择 **App Store Connect**
5. 按向导完成上传

---

## 第六步：在 App Store Connect 配置

登录 [appstoreconnect.apple.com](https://appstoreconnect.apple.com)：

1. **我的 App** → 新建 App
   - 平台：iOS
   - 名称：Pesta
   - Bundle ID：com.pesta.app
2. 填写 App 信息（描述、关键词、截图）
3. 选择刚上传的构建版本
4. 提交审核

---

## 常用命令速查

```bash
# 构建并同步
pnpm cap:build:ios

# 仅同步（已有构建）
pnpm cap:sync

# 打开 Xcode
pnpm cap:open:ios

# 只复制资源（不更新插件）
pnpm cap:copy
```

---

## 注意事项

- **NFC 功能**：需要在 Xcode → Signing & Capabilities → + Capability → Near Field Communication Tag Reading，并且需要 Apple 审核通过的 NFC entitlement
- **隐私权限**：Info.plist 已预填相机、相册、NFC 使用说明，确保中文描述准确
- **网络请求**：NSAppTransportSecurity 已设置 `NSAllowsArbitraryLoads = true`（开发期间），生产环境建议改为具体域名白名单
