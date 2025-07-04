# DTax-Bridge - Shopify 跨境税费&物流一体化 App

## 项目概述

DTax-Bridge 是一个专为中国跨境商家设计的 Shopify 插件，提供从关税/增值税预估、物流方案对比，到 IOSS/UK VAT/Section 321 等合规申报的一站式解决方案。

## 功能特性

- 🧮 **精准税费计算**: 支持 EU VAT、US Duty 等 45+ 目的地税费计算
- 🚚 **物流方案对比**: 聚合 DHL eCom、YunExpress 等 10+ 物流线路
- 📋 **合规申报自动化**: 自动处理 IOSS、UK VAT、Section 321 申报
- 🛒 **原生结账体验**: 通过 Shopify Functions 实现无缝集成
- 📊 **智能报表分析**: 提供详细的税费和物流数据分析
- 🌐 **多语言支持**: 中英文界面，本土化服务

## 技术架构

### 前端
- **Framework**: React + TypeScript
- **UI Library**: Shopify Polaris
- **State Management**: React Context + SWR
- **Build Tool**: Vite

### 后端
- **Framework**: NestJS + TypeScript
- **API**: GraphQL
- **Database**: PostgreSQL + DynamoDB
- **Cache**: Redis
- **Queue**: AWS SQS

### 基础设施
- **Cloud**: AWS (Lambda + API Gateway + CloudFront)
- **CI/CD**: GitHub Actions
- **Monitoring**: CloudWatch + AWS X-Ray

## 项目结构

```
dtax-bridge/
├── apps/
│   ├── admin/              # Shopify App 管理界面
│   ├── checkout-extension/ # Checkout Extensions
│   └── api/               # 后端 API 服务
├── packages/
│   ├── shared/            # 共享代码
│   ├── tax-calculator/    # 税费计算引擎
│   ├── logistics-api/     # 物流 API 封装
│   └── compliance/        # 合规申报模块
├── infrastructure/        # AWS CDK 基础设施
├── docs/                 # 技术文档
├── tests/                # 测试文件
└── scripts/              # 构建脚本
```

## 开发环境设置

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 运行测试

```bash
npm test
```

### 代码格式化

```bash
npm run format
```

### 类型检查

```bash
npm run type-check
```

## 环境变量

创建 `.env` 文件并配置以下变量：

```bash
# Shopify App 配置
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_products,write_orders,read_customers

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/dtax_bridge
REDIS_URL=redis://localhost:6379

# AWS 配置
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# 第三方 API
DHL_API_KEY=your_dhl_api_key
YUNEXPRESS_API_KEY=your_yunexpress_api_key
```

## 部署

### 开发环境

```bash
npm run deploy:dev
```

### 生产环境

```bash
npm run deploy:prod
```

## 贡献指南

1. Fork 本仓库
2. 创建特性分支: `git checkout -b feature/amazing-feature`
3. 提交变更: `git commit -m 'Add amazing feature'`
4. 推送到分支: `git push origin feature/amazing-feature`
5. 提交 Pull Request

## 代码规范

- 使用 ESLint + Prettier 进行代码格式化
- 遵循 TypeScript 严格模式
- 所有 PR 必须通过 CI 检查
- 代码覆盖率要求 >80%

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 联系我们

- 项目地址: https://github.com/cswanghan/MyShopifyApp
- 问题反馈: https://github.com/cswanghan/MyShopifyApp/issues
- 文档: https://docs.dtax-bridge.com

## 版本历史

- **v1.0.0** - 初始版本
  - 基础税费计算功能
  - 物流方案对比
  - Shopify App 管理界面
  - Checkout Extensions 集成

---

Made with ❤️ by DTax-Bridge Team