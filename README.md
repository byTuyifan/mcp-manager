# MCP Manager

本地MCP服务管理器，带有Web用户界面。

## 功能特性

- 🚀 本地MCP服务管理
- 🌐 Web界面操作
- 📊 服务状态监控
- 🔄 服务启动/停止控制
- 📝 日志查看

## 项目结构

```
mcp-manager/
├── public/           # 静态资源文件
│   ├── index.html   # Web界面主页面
│   └── style.css    # 样式文件
├── server.js        # 主服务器文件
├── services.json    # 服务配置文件
├── package.json     # 项目依赖配置
└── README.md        # 项目说明文档
```

## 安装和运行

### 环境要求
- Node.js (支持CommonJS模块)
- npm

### 安装依赖
```bash
npm install
```

### 启动服务
```bash
npm start
```

服务启动后，通过浏览器访问 `http://localhost:3000` (或相应端口) 来使用Web界面。

## 技术栈

- **后端**: Node.js + Express
- **前端**: HTML + CSS + JavaScript
- **模块系统**: CommonJS

## 配置说明

### services.json - 服务配置文件

这是MCP管理器核心配置文件，用于定义和管理所有的MCP服务。

#### 文件结构

```json
{
  "services": [
    {
      "name": "服务名称",
      "workdir": "工作目录路径",
      "command": "启动命令",
      "args": ["参数1", "参数2"],
      "useShell": true/false
    }
  ]
}
```

#### 配置字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 服务的显示名称，用于在Web界面中标识服务 |
| `workdir` | string | ✅ | 服务的工作目录，服务将在此目录下运行 |
| `command` | string | ✅ | 启动服务的命令（如：`node`, `python`, `pnpm`等） |
| `args` | array | ✅ | 命令的参数数组，按顺序传递给命令 |
| `useShell` | boolean | ✅ | 是否使用shell执行命令 |

#### 配置示例

**示例1：Python服务**
```json
{
  "name": "Lanhu MCP",
  "workdir": "D:/MyMcp/lanhu-mcp",
  "command": "D:/MyMcp/lanhu-mcp/.venv/Scripts/python.exe",
  "args": ["lanhu_mcp_server.py"],
  "useShell": false
}
```

**示例2：Node.js/pnpm服务**
```json
{
  "name": "Context7 MCP",
  "workdir": "D:/MyMcp/context7",
  "command": "pnpm",
  "args": ["run", "start:mcp"],
  "useShell": true
}
```

#### useShell 字段说明

- **`useShell: false`** - 直接执行命令
  - 更快的执行速度
  - 适用于直接调用可执行文件
  - 不支持shell特性（如通配符、管道等）

- **`useShell: true`** - 通过shell执行命令
  - 支持shell特性
  - 适用于需要使用shell命令的场景
  - 可以使用环境变量、管道、重定向等

#### 添加新服务

要添加新的MCP服务，只需在 `services` 数组中添加新的配置对象：

```json
{
  "services": [
    {
      "name": "现有服务1",
      "workdir": "...",
      "command": "...",
      "args": [...],
      "useShell": false
    },
    {
      "name": "新服务",
      "workdir": "服务的工作目录",
      "command": "启动命令",
      "args": ["参数列表"],
      "useShell": false
    }
  ]
}
```

#### 注意事项

1. **路径格式**：在Windows系统中，建议使用正斜杠 `/` 或双反斜杠 `\\`
2. **命令可用性**：确保 `command` 指定的命令在系统中可用或使用绝对路径
3. **工作目录**：确保 `workdir` 指定的目录存在
4. **参数顺序**：`args` 数组中的参数按顺序传递给命令
5. **修改后重启**：修改配置文件后，需要重启MCP管理器服务才能生效

### .gitignore - Git忽略文件

定义哪些文件和目录不应该被Git跟踪。

**主要忽略项：**
- 日志文件：`*.log`, `npm-debug.log*` 等
- 依赖目录：`node_modules`
- 构建产物：`dist`
- 编辑器配置：`.idea`, `*.suo` 等
- 系统文件：`.DS_Store` (macOS)
- 本地配置：`*.local`
- IDE配置：`.qoder`

### package.json - 项目配置

**核心配置字段：**

| 字段 | 说明 |
|------|------|
| `name` | 项目名称 |
| `version` | 项目版本 |
| `description` | 项目描述 |
| `main` | 入口文件 |
| `scripts.start` | 启动命令 (`npm start`) |
| `dependencies` | 项目依赖 |
| `type` | 模块系统类型 (commonjs) |

## 许可证

ISC