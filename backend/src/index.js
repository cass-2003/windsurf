// Backend API server for XG-Windsurf
// 使用 Express 提供与前端约定的 API 接口

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

// ========== 数据库配置 (lowdb) ==========
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

// 数据库文件存放在 backend/data/db.json
const dbPath = path.join(__dirname, '..', 'data', 'db.json');
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const adapter = new FileSync(dbPath);
const db = low(adapter);

// 设置数据库默认结构
db.defaults({ keys: [], announcements: [] }).write();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// 统一响应封装函数
function success(data = null, message = 'success') {
  return { code: 0, message, msg: message, data };
}

function error(message = 'error', code = 1, data = null) {
  return { code, message, msg: message, data };
}

// ========== 激活码生成工具函数 ==========
/**
 * 生成随机激活码
 * @param {number} length - 激活码长度（不含分隔符），默认16位
 * @param {boolean} useSeparator - 是否使用分隔符（每4位一个 -），默认 true
 * @returns {string} 生成的激活码，如 A3X9-K2M8-P5N7-Q1R4
 */
function generateActivationCode(length = 16, useSeparator = true) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除易混淆的 0/O, 1/I/L
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (useSeparator && length >= 4) {
    // 每4位加一个分隔符
    return code.match(/.{1,4}/g).join('-');
  }
  return code;
}

// ========== 数据库操作封装 ==========
const KeysDB = {
  // 获取激活码
  get(key_code) {
    return db.get('keys').find({ key_code }).value();
  },
  // 检查是否存在
  has(key_code) {
    return !!this.get(key_code);
  },
  // 添加激活码
  add(record) {
    db.get('keys').push(record).write();
  },
  // 更新激活码
  update(key_code, updates) {
    db.get('keys').find({ key_code }).assign(updates).write();
  },
  // 删除激活码
  delete(key_code) {
    db.get('keys').remove({ key_code }).write();
  },
  // 获取所有激活码
  getAll() {
    return db.get('keys').value();
  },
  // 获取数量
  count() {
    return db.get('keys').size().value();
  }
};

// 初始化测试激活码（仅在数据库为空时）
if (KeysDB.count() === 0) {
  const now = Date.now();
  const oneMonthMs = 30 * 24 * 3600 * 1000;
  
  const demoKeys = [
    {
      key_code: 'DEMO-VALID-1',
      device_id: null,
      quota_total: 10000,
      quota_used: 100,
      activated_at: new Date(now).toISOString(),
      expired_at: new Date(now + oneMonthMs).toISOString(),
      status: 'active',
      created_at: new Date(now).toISOString(),
    },
    {
      key_code: 'DEMO-EXPIRED-1',
      device_id: null,
      quota_total: 5000,
      quota_used: 5000,
      activated_at: new Date(now - oneMonthMs).toISOString(),
      expired_at: new Date(now - 24 * 3600 * 1000).toISOString(),
      status: 'expired',
      created_at: new Date(now - oneMonthMs).toISOString(),
    },
    {
      key_code: 'DEMO-BANNED-1',
      device_id: null,
      quota_total: 8000,
      quota_used: 0,
      activated_at: new Date(now - 7 * 24 * 3600 * 1000).toISOString(),
      expired_at: new Date(now + oneMonthMs).toISOString(),
      status: 'banned',
      created_at: new Date(now - 7 * 24 * 3600 * 1000).toISOString(),
    },
    {
      key_code: 'DEMO-BOUND-1',
      device_id: 'OTHER-DEVICE-ID',
      quota_total: 12000,
      quota_used: 200,
      activated_at: new Date(now - 3 * 24 * 3600 * 1000).toISOString(),
      expired_at: new Date(now + oneMonthMs).toISOString(),
      status: 'active',
      created_at: new Date(now - 3 * 24 * 3600 * 1000).toISOString(),
    }
  ];
  
  demoKeys.forEach(key => KeysDB.add(key));
  console.log('✅ 已初始化 4 个测试激活码');
}

// POST /api/account/validate-key
// request: { key_code, device_id }
app.post('/api/account/validate-key', (req, res) => {
  const { key_code, device_id } = req.body || {};

  if (!key_code || !device_id) {
    return res.json(error('缺少 key_code 或 device_id'));
  }

  const record = KeysDB.get(key_code);
  if (!record) {
    return res.json(error('激活码无效')); // code != 0 视为失败
  }

  const nowDate = new Date();
  const expiredAt = record.expired_at ? new Date(record.expired_at) : null;

  // 状态校验：封禁
  if (record.status === 'banned') {
    return res.json(error('激活码已被封禁', 1002));
  }

  // 状态校验：过期（无论 status 是否设置为 expired，只要时间已过期都视为过期）
  if (expiredAt && expiredAt.getTime() < nowDate.getTime()) {
    return res.json(error('激活码已过期', 1001));
  }

  // 设备绑定校验：如果已绑定到其他设备，则不允许再次绑定
  if (record.device_id && record.device_id !== device_id) {
    return res.json(error('该激活码已绑定到其他设备', 1003));
  }

  // 通过校验：绑定到当前设备（如果之前未绑定）
  const updates = { device_id };
  if (!record.activated_at) {
    updates.activated_at = nowDate.toISOString();
  }
  KeysDB.update(key_code, updates);
  
  // 重新获取更新后的记录
  const updatedRecord = KeysDB.get(key_code);

  const quota_total = updatedRecord.quota_total;
  const quota_used = updatedRecord.quota_used;
  const quota_remaining = quota_total - quota_used;

  return res.json(success({
    valid: true,
    key_code,
    device_id,
    checked_at: nowDate.toISOString(),
    quota_used,
    quota_total,
    quota_remaining,
    activated_at: updatedRecord.activated_at,
    expired_at: updatedRecord.expired_at,
    config: JSON.stringify({ example: true }),
  }));
});

// POST /api/account/activate-refresh
// request: { key_code, device_id }
app.post('/api/account/activate-refresh', (req, res) => {
  const { key_code, device_id } = req.body || {};

  if (!key_code || !device_id) {
    return res.json(error('缺少 key_code 或 device_id'));
  }

  const record = KeysDB.get(key_code);
  if (!record) {
    return res.json(error('激活码无效'));
  }

  // 伪造一个账户 JSON 字符串，前端会在 ApiService 中解析
  const accountObject = {
    metadata: { plan: 'pro', features: ['windsurf', 'cursor'], note: 'demo account' },
    timestamp: Date.now(),
  };

  const data = {
    mail: 'user@example.com',
    oem_info: {
      reseller_name: 'Demo Reseller',
      app_name: 'XG-Windsurf',
      app_icon: '',
      app_links: '',
      reseller_status: 1,
    },
    key_info: {
      key_status: 1,
      activated_at: record.activated_at,
      expired_at: record.expired_at,
      quota_key_max_quota: record.quota_total,
      quota_key_used_quota: record.quota_used,
    },
    account: JSON.stringify(accountObject),
    metadata: undefined,
    timestamp: undefined,
  };

  return res.json(success(data));
});

// POST /release
// request: { activationCode, deviceId }
app.post('/release', (req, res) => {
  const { activationCode, deviceId } = req.body || {};

  if (!activationCode || !deviceId) {
    return res.json(error('缺少 activationCode 或 deviceId'));
  }

  const record = KeysDB.get(activationCode);
  if (!record || record.device_id !== deviceId) {
    return res.json(error('未找到匹配的设备绑定信息'));
  }

  KeysDB.update(activationCode, { device_id: null });
  return res.json(success(null, '设备解绑成功'));
});

// POST /quota/api/key-usage
// request: { quota_key, device_id }
app.post('/quota/api/key-usage', (req, res) => {
  const { quota_key, device_id } = req.body || {};

  if (!quota_key || !device_id) {
    return res.json(error('缺少 quota_key 或 device_id'));
  }

  const record = KeysDB.get(quota_key);
  if (!record) {
    return res.json(error('激活码无效'));
  }

  const data = {
    total: 1,
    keys: [
      {
        quota_key,
        quota_key_max_quota: record.quota_total,
        reseller_id: null,
        quota_key_remark: 'Demo Key',
        quota_key_period_hour: 24,
      },
    ],
  };

  return res.json(success(data));
});

// GET /api/announcements
app.get('/api/announcements', (req, res) => {
  const now = new Date();
  const announcements = [
    {
      id: 1,
      title: '欢迎使用 XG-Windsurf',
      content: '这是一个示例公告，你可以在后端自由修改。',
      type: 'info',
      priority: 1,
      created_at: now.toISOString(),
      start_time: null,
      end_time: null,
    },
  ];

  return res.json(success({ announcements, total: announcements.length }));
});

// POST /api/key/convert
// request: { key_code }
app.post('/api/key/convert', (req, res) => {
  const { key_code } = req.body || {};

  if (!key_code) {
    return res.json(error('缺少 key_code'));
  }

  const newKey = `WINDSURF-${key_code}-${Date.now()}`;
  const data = {
    original_key: key_code,
    original_quota_remaining: 1000,
    new_key: newKey,
    new_quota: 2000,
    new_expired_at: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    validity_months: 1,
    valid: true,
    deleted: false,
    checked_at: new Date().toISOString(),
  };

  return res.json({ code: 0, message: '转换成功', data });
});

// ========== 管理接口：激活码生成与管理 ==========

// POST /api/admin/generate-key
// 生成新的随机激活码
// request: { quota_total?, validity_days?, count?, length? }
app.post('/api/admin/generate-key', (req, res) => {
  const {
    quota_total = 10000,      // 默认额度
    validity_days = 30,       // 默认有效期（天）
    count = 1,                // 生成数量，默认1个
    length = 16               // 激活码长度，默认16位
  } = req.body || {};

  const generatedKeys = [];
  const nowMs = Date.now();
  const validityMs = validity_days * 24 * 3600 * 1000;

  for (let i = 0; i < Math.min(count, 100); i++) { // 最多一次生成100个
    let keyCode;
    // 确保不重复
    do {
      keyCode = generateActivationCode(length, true);
    } while (KeysDB.has(keyCode));

    const record = {
      key_code: keyCode,
      device_id: null,
      quota_total: quota_total,
      quota_used: 0,
      activated_at: null,
      expired_at: new Date(nowMs + validityMs).toISOString(),
      status: 'active',
      created_at: new Date(nowMs).toISOString(),
    };

    KeysDB.add(record);
    generatedKeys.push(record);
  }

  return res.json(success({
    count: generatedKeys.length,
    keys: generatedKeys
  }, `成功生成 ${generatedKeys.length} 个激活码`));
});

// GET /api/admin/list-keys
// 查看所有激活码（仅用于调试/管理）
app.get('/api/admin/list-keys', (req, res) => {
  const keys = KeysDB.getAll();
  return res.json(success({
    total: keys.length,
    keys: keys
  }));
});

// DELETE /api/admin/delete-key/:key_code
// 删除指定激活码
app.delete('/api/admin/delete-key/:key_code', (req, res) => {
  const { key_code } = req.params;
  if (!KeysDB.has(key_code)) {
    return res.json(error('激活码不存在'));
  }
  KeysDB.delete(key_code);
  return res.json(success(null, '激活码已删除'));
});

app.listen(PORT, () => {
  console.log(`XG-Windsurf backend API server is running on http://localhost:${PORT}`);
});
