const express = require('express');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3456;

// 存储运行中的进程 { name: ChildProcess }
const processes = {};

// 存储每个服务的日志 { name: { lines: [], counter: 0 } }
const serviceLogs = new Map();
const MAX_LOG_LINES = 1000;   // 每个服务最多保留多少条日志

// 配置文件路径
const CONFIG_PATH = path.join(__dirname, 'services.json');

// 辅助函数：向日志存储中添加一条
function addLogLine(store, text, type) {
  const index = store.counter++;
  store.lines.push({
    text,
    type,            // 'stdout' 或 'stderr'
    index,
    timestamp: new Date().toISOString()
  });
  // 超出上限时丢弃最旧的
  while (store.lines.length > MAX_LOG_LINES) {
    store.lines.shift();
  }
}

// 解析 JSON 请求体
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- 辅助函数 ----------





// ---------- API ----------

// 获取服务列表及运行状态
app.get('/api/services', (req, res) => {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    const services = config.services.map(svc => {
      const proc = processes[svc.name];
      const alive = proc && proc.exitCode === null;
      return {
        ...svc,
        running: alive,
        pid: alive ? proc.pid : null
      };
    });
    res.json({ services });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read config' });
  }
});

// 启动指定服务
app.post('/api/services/:name/start', (req, res) => {
  const { name } = req.params;
  // 如果已经运行
  if (processes[name] && processes[name].exitCode === null) {
    return res.json({ success: false, message: `Service ${name} is already running` });
  }

  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    const svc = config.services.find(s => s.name === name);
    if (!svc) return res.status(404).json({ error: 'Service not found' });

    // 初始化 / 重置日志存储
    if (!serviceLogs.has(name)) {
      serviceLogs.set(name, { lines: [], counter: 0 });
    } else {
      // 重启时清空旧日志
      serviceLogs.get(name).lines = [];
      serviceLogs.get(name).counter = 0;
    }
    const logStore = serviceLogs.get(name);

    const cmd = svc.command;
    const args = svc.args || [];
    const options = {
      cwd: svc.workdir,
      shell: svc.useShell === true,
      detached: false,
      windowsHide: true          // ← 关键：隐藏子进程窗口
    };

    const child = spawn(cmd, args, options);

    // 收集 stdout
    child.stdout.on('data', (data) => {
      const text = data.toString();
      console.log(`[${name}] ${text.trimEnd()}`);
      addLogLine(logStore, text, 'stdout');
    });
    // 收集 stderr
    child.stderr.on('data', (data) => {
      const text = data.toString();
      console.error(`[${name} ERROR] ${text.trimEnd()}`);
      addLogLine(logStore, text, 'stderr');
    });

    child.on('close', (code) => {
      console.log(`[${name}] Process exited with code ${code}`);
      delete processes[name];
    });
    child.on('error', (err) => {
      console.error(`[${name}] Failed to start: ${err.message}`);
      delete processes[name];
    });

    processes[name] = child;
    res.json({ success: true, pid: child.pid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 停止指定服务
app.post('/api/services/:name/stop', (req, res) => {
  const { name } = req.params;
  const child = processes[name];
  if (!child || child.exitCode !== null) {
    return res.json({ success: false, message: `Service ${name} is not running` });
  }

  const pid = child.pid;
  if (!pid) {
    child.kill();
    delete processes[name];
    return res.json({ success: true });
  }

  const isWindows = process.platform === 'win32';

  try {
    if (isWindows) {
      require('child_process').exec(`taskkill /pid ${pid} /T /F`, (err) => {
        if (err) {
          console.error(`[${name}] taskkill error: ${err.message}`);
        }
        delete processes[name];
      });
    } else {
      try {
        process.kill(-pid, 'SIGTERM');
      } catch (e) {
        child.kill('SIGTERM');
      }
      const forceKillTimeout = setTimeout(() => {
        try {
          process.kill(-pid, 'SIGKILL');
        } catch (e) {
          child.kill('SIGKILL');
        }
      }, 5000);
      child.on('close', () => {
        clearTimeout(forceKillTimeout);
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取指定服务的日志（增量获取）
app.get('/api/services/:name/logs', (req, res) => {
  const { name } = req.params;
  const since = parseInt(req.query.since) || -1;   // 客户端最后一条日志的 index
  const store = serviceLogs.get(name);

  if (!store) {
    // 从未启动过
    return res.json({ lines: [], nextSince: 0 });
  }

  // 返回所有 index > since 的日志行
  const newLines = store.lines.filter(line => line.index > since);
  const nextSince = newLines.length > 0 ? newLines[newLines.length - 1].index : since;
  res.json({ lines: newLines, nextSince });
});

// 获取原始配置文件内容（用于编辑）
app.get('/api/config', (req, res) => {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    res.json({ content: raw });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read config' });
  }
});

// 保存配置文件
app.post('/api/config', (req, res) => {
  try {
    const newContent = req.body.content;
    if (typeof newContent !== 'string') {
      return res.status(400).json({ error: 'Invalid content format' });
    }
    JSON.parse(newContent);   // 校验 JSON
    fs.writeFileSync(CONFIG_PATH, newContent, 'utf-8');
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});





// 启动服务器
app.listen(PORT, () => {
  console.log(`MCP Manager is running at http://localhost:${PORT}`);
});