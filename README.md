# 本体论笔记助手 - Ontology Note Helper

一个基于 AI 的知识图谱生成工具，自动从文本中提取概念和关系，构建可视化的本体论图谱。

## 功能特点

- AI 智能提取：自动从文本中提取核心概念和关系
- 交互式图谱：可拖拽、缩放、点击查看详情
- 多格式导出：支持导出 JSON 和 PNG 图片
- 公开访问：部署后别人打开链接即可使用
- 安全配置：API Key 只保存在服务端环境变量，不暴露给用户浏览器

## 推荐部署方式：Vercel

### 1. 准备代码仓库

把本项目上传到 GitHub。项目目录需要包含：

```text
ontology-note-helper/
├── index.html
├── app.js
├── server.js
├── package.json
├── vercel.json
├── .env.example
└── README.md
```

### 2. 导入 Vercel

1. 打开 Vercel
2. 选择 New Project
3. 导入你的 GitHub 仓库
4. Framework Preset 选择 Other
5. 点击 Deploy 前，先配置环境变量

### 3. 配置环境变量

在 Vercel 项目设置中添加：

```text
API_PROVIDER=deepseek
API_KEY=你的 DeepSeek API Key
API_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-chat
```

可选访问码：

```text
ACCESS_CODE=你想设置的访问码
```

如果不设置 `ACCESS_CODE`，任何打开链接的人都能直接使用。

### 4. 部署完成

部署成功后，Vercel 会给你一个公开链接，例如：

```text
https://your-project.vercel.app
```

把这个链接发给别人，对方就可以使用。

## 本地运行

```bash
cd ontology-note-helper
npm install
cp .env.example .env
npm start
```

然后访问：

```text
http://localhost:3000
```

## API 配置建议

### DeepSeek 推荐配置

```text
API_PROVIDER=deepseek
API_BASE_URL=https://api.deepseek.com
MODEL_NAME=deepseek-chat
```

### OpenAI 兼容接口

```text
API_PROVIDER=openai
API_BASE_URL=https://api.openai.com
MODEL_NAME=gpt-4o-mini
```

### Anthropic Claude

```text
API_PROVIDER=anthropic
API_BASE_URL=https://api.anthropic.com
MODEL_NAME=claude-3-5-sonnet-latest
```

## 使用说明

1. 打开网站
2. 粘贴笔记、文章或课程内容
3. 点击“提取知识图谱”
4. 查看自动生成的概念节点和关系连线
5. 点击节点查看概念定义
6. 点击连线查看关系解释
7. 可导出 JSON 或 PNG 图片

## 演示模式

如果你还没配置 API，也可以点击“演示”按钮查看内置知识图谱效果。

## 注意事项

- 不要把真实 API Key 写进前端代码
- 不要把 `.env` 上传到 GitHub
- 如果公开给很多人使用，建议设置 `ACCESS_CODE`，避免 API 被大量消耗
- 当前限制单次输入最多 8000 字

## 技术栈

- 前端：HTML + Tailwind CSS + JavaScript
- 图谱可视化：Cytoscape.js
- 后端：Node.js + Express
- 部署：Vercel / Render / Railway

## 项目价值

适合用于：

- 学习笔记整理
- 课程知识结构化
- 文献阅读梳理
- 文章核心概念提取
- AI + 教育项目展示
