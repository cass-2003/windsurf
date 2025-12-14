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
db.defaults({ 
  keys: [],           // 激活码
  accounts: [],       // Windsurf 账号池
  assignments: [],    // 激活码与账号的绑定关系
  announcements: [] 
}).write();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// 静态文件服务（管理后台）
app.use(express.static(path.join(__dirname, '..', 'public')));

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
  get(key_code) {
    return db.get('keys').find({ key_code }).value();
  },
  has(key_code) {
    return !!this.get(key_code);
  },
  add(record) {
    db.get('keys').push(record).write();
  },
  update(key_code, updates) {
    db.get('keys').find({ key_code }).assign(updates).write();
  },
  delete(key_code) {
    db.get('keys').remove({ key_code }).write();
  },
  getAll() {
    return db.get('keys').value();
  },
  count() {
    return db.get('keys').size().value();
  }
};

// ========== 号池数据库操作 ==========
const AccountsDB = {
  // 获取单个账号
  get(id) {
    return db.get('accounts').find({ id }).value();
  },
  // 获取所有账号
  getAll() {
    return db.get('accounts').value();
  },
  // 获取空闲账号
  getIdle() {
    return db.get('accounts').filter({ status: 'idle' }).value();
  },
  // 添加账号
  add(record) {
    db.get('accounts').push(record).write();
  },
  // 更新账号
  update(id, updates) {
    db.get('accounts').find({ id }).assign(updates).write();
  },
  // 删除账号
  delete(id) {
    db.get('accounts').remove({ id }).write();
  },
  // 数量
  count() {
    return db.get('accounts').size().value();
  }
};

// ========== 分配记录数据库操作 ==========
const AssignmentsDB = {
  // 根据激活码获取当前有效的分配
  getByKeyCode(key_code) {
    return db.get('assignments').find({ key_code, status: 'active' }).value();
  },
  // 根据账号ID获取当前分配
  getByAccountId(account_id) {
    return db.get('assignments').filter({ account_id, status: 'active' }).value();
  },
  // 添加分配记录
  add(record) {
    db.get('assignments').push(record).write();
  },
  // 更新分配记录
  update(id, updates) {
    db.get('assignments').find({ id }).assign(updates).write();
  },
  // 释放分配（标记为 released）
  release(id) {
    db.get('assignments').find({ id }).assign({ status: 'released', released_at: new Date().toISOString() }).write();
  },
  // 获取所有分配
  getAll() {
    return db.get('assignments').value();
  }
};

// ========== 号池核心逻辑 ==========
/**
 * 为激活码分配一个 Windsurf 账号
 * @param {string} key_code - 激活码
 * @param {string} device_id - 设备ID
 * @returns {{ success: boolean, account?: object, error?: string }}
 */
function assignAccountToKey(key_code, device_id) {
  // 检查是否已有分配
  const existingAssignment = AssignmentsDB.getByKeyCode(key_code);
  if (existingAssignment) {
    // 已有分配，返回现有账号
    const account = AccountsDB.get(existingAssignment.account_id);
    if (account) {
      return { success: true, account, assignment: existingAssignment };
    }
  }
  
  // 获取一个空闲账号
  const idleAccounts = AccountsDB.getIdle();
  if (idleAccounts.length === 0) {
    return { success: false, error: '暂无可用账号，请稍后再试' };
  }
  
  // 选择第一个空闲账号（可以改成随机选择）
  const account = idleAccounts[0];
  
  // 创建分配记录
  const assignmentId = `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const assignment = {
    id: assignmentId,
    key_code,
    account_id: account.id,
    device_id,
    assigned_at: new Date().toISOString(),
    status: 'active'
  };
  
  AssignmentsDB.add(assignment);
  
  // 更新账号状态为使用中
  AccountsDB.update(account.id, { 
    status: 'in_use', 
    current_key: key_code,
    last_assigned_at: new Date().toISOString()
  });
  
  return { success: true, account, assignment };
}

/**
 * 切换账号（消耗一次切换次数）
 * @param {string} key_code - 激活码
 * @param {string} device_id - 设备ID
 * @returns {{ success: boolean, account?: object, error?: string }}
 */
function switchAccount(key_code, device_id) {
  const keyRecord = KeysDB.get(key_code);
  if (!keyRecord) {
    return { success: false, error: '激活码无效' };
  }
  
  // 检查激活码模式和剩余次数
  if (keyRecord.mode === 'switch_count') {
    if (keyRecord.switch_used >= keyRecord.switch_total) {
      return { success: false, error: '切换次数已用完' };
    }
  }
  
  // 释放当前账号
  const currentAssignment = AssignmentsDB.getByKeyCode(key_code);
  if (currentAssignment) {
    AssignmentsDB.release(currentAssignment.id);
    AccountsDB.update(currentAssignment.account_id, { 
      status: 'idle', 
      current_key: null 
    });
  }
  
  // 分配新账号
  const result = assignAccountToKey(key_code, device_id);
  
  if (result.success && keyRecord.mode === 'switch_count') {
    // 消耗一次切换次数
    KeysDB.update(key_code, { 
      switch_used: (keyRecord.switch_used || 0) + 1 
    });
  }
  
  return result;
}

// 初始化测试数据（仅在数据库为空时）
if (KeysDB.count() === 0) {
  const now = Date.now();
  const oneMonthMs = 30 * 24 * 3600 * 1000;
  
  // 测试激活码 - 新结构支持两种模式
  const demoKeys = [
    {
      key_code: 'DEMO-TIME-30D',
      device_id: null,
      mode: 'time',              // 时间模式
      validity_days: 30,         // 有效期30天
      switch_total: null,        // 时间模式不限切换次数
      switch_used: 0,
      activated_at: null,
      expired_at: null,          // 激活时计算
      status: 'active',
      created_at: new Date(now).toISOString(),
    },
    {
      key_code: 'DEMO-SWITCH-10',
      device_id: null,
      mode: 'switch_count',      // 次数模式
      validity_days: null,       // 次数模式不限时间
      switch_total: 10,          // 可切换10次
      switch_used: 0,
      activated_at: null,
      expired_at: null,
      status: 'active',
      created_at: new Date(now).toISOString(),
    }
  ];
  
  demoKeys.forEach(key => KeysDB.add(key));
  console.log('✅ 已初始化 2 个测试激活码（时间模式 + 次数模式）');
}

// 初始化测试账号池（仅在为空时）
if (AccountsDB.count() === 0) {
  const demoAccounts = [
    {
      id: 'acc_001',
      login: 'demo1@example.com',
      password: 'demo_password_1',  // 实际使用时应加密
      status: 'idle',
      current_key: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'acc_002',
      login: 'demo2@example.com',
      password: 'demo_password_2',
      status: 'idle',
      current_key: null,
      created_at: new Date().toISOString(),
    }
  ];
  
  demoAccounts.forEach(acc => AccountsDB.add(acc));
  console.log('✅ 已初始化 2 个测试账号');
}

// POST /api/account/validate-key
// request: { key_code, device_id }
// 激活码验证 + 自动分配 Windsurf 账号
app.post('/api/account/validate-key', (req, res) => {
  const { key_code, device_id } = req.body || {};

  if (!key_code || !device_id) {
    return res.json(error('缺少 key_code 或 device_id'));
  }

  const record = KeysDB.get(key_code);
  if (!record) {
    return res.json(error('激活码无效'));
  }

  const nowDate = new Date();

  // 状态校验：封禁
  if (record.status === 'banned') {
    return res.json(error('激活码已被封禁', 1002));
  }

  // 时间模式：检查是否过期
  if (record.mode === 'time' && record.expired_at) {
    const expiredAt = new Date(record.expired_at);
    if (expiredAt.getTime() < nowDate.getTime()) {
      return res.json(error('激活码已过期', 1001));
    }
  }

  // 次数模式：检查切换次数是否用完
  if (record.mode === 'switch_count') {
    if ((record.switch_used || 0) >= (record.switch_total || 0)) {
      return res.json(error('切换次数已用完', 1004));
    }
  }

  // 设备绑定校验
  if (record.device_id && record.device_id !== device_id) {
    return res.json(error('该激活码已绑定到其他设备', 1003));
  }

  // 首次激活：设置激活时间和过期时间
  const updates = { device_id };
  if (!record.activated_at) {
    updates.activated_at = nowDate.toISOString();
    // 时间模式：激活时计算过期时间
    if (record.mode === 'time' && record.validity_days) {
      const expiredAt = new Date(nowDate.getTime() + record.validity_days * 24 * 3600 * 1000);
      updates.expired_at = expiredAt.toISOString();
    }
  }
  KeysDB.update(key_code, updates);
  
  // 分配 Windsurf 账号
  const assignResult = assignAccountToKey(key_code, device_id);
  
  // 重新获取更新后的记录
  const updatedRecord = KeysDB.get(key_code);

  // 构建响应数据
  const responseData = {
    valid: true,
    key_code,
    device_id,
    mode: updatedRecord.mode,
    checked_at: nowDate.toISOString(),
    activated_at: updatedRecord.activated_at,
    expired_at: updatedRecord.expired_at,
    // 时间模式信息
    validity_days: updatedRecord.validity_days,
    // 次数模式信息
    switch_total: updatedRecord.switch_total,
    switch_used: updatedRecord.switch_used || 0,
    switch_remaining: updatedRecord.switch_total ? (updatedRecord.switch_total - (updatedRecord.switch_used || 0)) : null,
  };

  // 如果成功分配了账号，返回账号信息
  if (assignResult.success && assignResult.account) {
    responseData.windsurf_account = {
      login: assignResult.account.login,
      password: assignResult.account.password,
    };
    responseData.has_account = true;
  } else {
    responseData.has_account = false;
    responseData.account_error = assignResult.error || '暂无可用账号';
  }

  return res.json(success(responseData));
});

// POST /api/account/activate-refresh
// request: { key_code, device_id }
// 刷新激活码状态，返回当前绑定的账号信息
app.post('/api/account/activate-refresh', (req, res) => {
  const { key_code, device_id } = req.body || {};

  if (!key_code || !device_id) {
    return res.json(error('缺少 key_code 或 device_id'));
  }

  const record = KeysDB.get(key_code);
  if (!record) {
    return res.json(error('激活码无效'));
  }

  // 获取当前分配的账号
  const assignment = AssignmentsDB.getByKeyCode(key_code);
  let accountInfo = null;
  if (assignment) {
    const account = AccountsDB.get(assignment.account_id);
    if (account) {
      accountInfo = {
        login: account.login,
        password: account.password,
      };
    }
  }

  const data = {
    key_code,
    mode: record.mode,
    activated_at: record.activated_at,
    expired_at: record.expired_at,
    validity_days: record.validity_days,
    switch_total: record.switch_total,
    switch_used: record.switch_used || 0,
    switch_remaining: record.switch_total ? (record.switch_total - (record.switch_used || 0)) : null,
    windsurf_account: accountInfo,
    has_account: !!accountInfo,
  };

  return res.json(success(data));
});

// ========== 号池接口 ==========

// POST /api/pool/switch
// 切换账号（消耗一次切换次数）
app.post('/api/pool/switch', (req, res) => {
  const { key_code, device_id } = req.body || {};

  if (!key_code || !device_id) {
    return res.json(error('缺少 key_code 或 device_id'));
  }

  const record = KeysDB.get(key_code);
  if (!record) {
    return res.json(error('激活码无效'));
  }

  // 验证设备
  if (record.device_id !== device_id) {
    return res.json(error('设备验证失败'));
  }

  // 执行切换
  const result = switchAccount(key_code, device_id);
  
  if (!result.success) {
    return res.json(error(result.error || '切换失败'));
  }

  const updatedRecord = KeysDB.get(key_code);

  return res.json(success({
    key_code,
    switch_total: updatedRecord.switch_total,
    switch_used: updatedRecord.switch_used || 0,
    switch_remaining: updatedRecord.switch_total ? (updatedRecord.switch_total - (updatedRecord.switch_used || 0)) : null,
    windsurf_account: {
      login: result.account.login,
      password: result.account.password,
    },
  }, '切换成功'));
});

// GET /api/pool/current
// 获取当前绑定的账号
app.post('/api/pool/current', (req, res) => {
  const { key_code, device_id } = req.body || {};

  if (!key_code) {
    return res.json(error('缺少 key_code'));
  }

  const assignment = AssignmentsDB.getByKeyCode(key_code);
  if (!assignment) {
    return res.json(error('暂无分配的账号'));
  }

  const account = AccountsDB.get(assignment.account_id);
  if (!account) {
    return res.json(error('账号不存在'));
  }

  return res.json(success({
    key_code,
    windsurf_account: {
      login: account.login,
      password: account.password,
    },
    assigned_at: assignment.assigned_at,
  }));
});

// POST /release
// request: { activationCode, deviceId }
// 解绑设备并释放账号
app.post('/release', (req, res) => {
  const { activationCode, deviceId } = req.body || {};

  if (!activationCode || !deviceId) {
    return res.json(error('缺少 activationCode 或 deviceId'));
  }

  const record = KeysDB.get(activationCode);
  if (!record || record.device_id !== deviceId) {
    return res.json(error('未找到匹配的设备绑定信息'));
  }

  // 释放当前分配的账号
  const assignment = AssignmentsDB.getByKeyCode(activationCode);
  if (assignment) {
    AssignmentsDB.release(assignment.id);
    AccountsDB.update(assignment.account_id, { 
      status: 'idle', 
      current_key: null 
    });
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
// request: { mode, validity_days?, switch_total?, count?, length? }
app.post('/api/admin/generate-key', (req, res) => {
  const {
    mode = 'time',            // 模式：'time' (时间模式) 或 'switch_count' (次数模式)
    validity_days = 30,       // 时间模式：有效期（天）
    switch_total = 10,        // 次数模式：可切换次数
    count = 1,                // 生成数量，默认1个
    length = 16               // 激活码长度，默认16位
  } = req.body || {};

  const generatedKeys = [];
  const nowMs = Date.now();

  for (let i = 0; i < Math.min(count, 100); i++) {
    let keyCode;
    do {
      keyCode = generateActivationCode(length, true);
    } while (KeysDB.has(keyCode));

    const record = {
      key_code: keyCode,
      device_id: null,
      mode: mode,
      // 时间模式字段
      validity_days: mode === 'time' ? validity_days : null,
      expired_at: null,  // 激活时计算
      // 次数模式字段
      switch_total: mode === 'switch_count' ? switch_total : null,
      switch_used: 0,
      // 通用字段
      activated_at: null,
      status: 'active',
      created_at: new Date(nowMs).toISOString(),
    };

    KeysDB.add(record);
    generatedKeys.push(record);
  }

  return res.json(success({
    count: generatedKeys.length,
    mode: mode,
    keys: generatedKeys
  }, `成功生成 ${generatedKeys.length} 个${mode === 'time' ? '时间模式' : '次数模式'}激活码`));
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

// ========== 管理接口：号池管理 ==========

// POST /api/admin/import-accounts
// 批量导入 Windsurf 账号
// request: { accounts: [{ login, password }, ...] }
app.post('/api/admin/import-accounts', (req, res) => {
  const { accounts } = req.body || {};

  if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
    return res.json(error('请提供账号列表'));
  }

  const imported = [];
  const skipped = [];
  const nowMs = Date.now();

  accounts.forEach((acc, index) => {
    if (!acc.login || !acc.password) {
      skipped.push({ index, reason: '缺少 login 或 password' });
      return;
    }

    // 检查是否已存在
    const existing = db.get('accounts').find({ login: acc.login }).value();
    if (existing) {
      skipped.push({ index, login: acc.login, reason: '账号已存在' });
      return;
    }

    const record = {
      id: `acc_${nowMs}_${Math.random().toString(36).substr(2, 9)}`,
      login: acc.login,
      password: acc.password,
      status: 'idle',
      current_key: null,
      created_at: new Date(nowMs).toISOString(),
    };

    AccountsDB.add(record);
    imported.push({ id: record.id, login: record.login });
  });

  return res.json(success({
    imported_count: imported.length,
    skipped_count: skipped.length,
    imported,
    skipped,
  }, `成功导入 ${imported.length} 个账号`));
});

// GET /api/admin/list-accounts
// 查看所有账号
app.get('/api/admin/list-accounts', (req, res) => {
  const accounts = AccountsDB.getAll();
  // 不返回密码，只返回基本信息
  const safeAccounts = accounts.map(acc => ({
    id: acc.id,
    login: acc.login,
    status: acc.status,
    current_key: acc.current_key,
    created_at: acc.created_at,
    last_assigned_at: acc.last_assigned_at,
  }));

  return res.json(success({
    total: safeAccounts.length,
    idle_count: accounts.filter(a => a.status === 'idle').length,
    in_use_count: accounts.filter(a => a.status === 'in_use').length,
    accounts: safeAccounts,
  }));
});

// DELETE /api/admin/delete-account/:id
// 删除指定账号
app.delete('/api/admin/delete-account/:id', (req, res) => {
  const { id } = req.params;
  const account = AccountsDB.get(id);
  if (!account) {
    return res.json(error('账号不存在'));
  }
  if (account.status === 'in_use') {
    return res.json(error('账号正在使用中，无法删除'));
  }
  AccountsDB.delete(id);
  return res.json(success(null, '账号已删除'));
});

// GET /api/admin/pool-stats
// 获取号池统计信息
app.get('/api/admin/pool-stats', (req, res) => {
  const accounts = AccountsDB.getAll();
  const keys = KeysDB.getAll();
  const assignments = AssignmentsDB.getAll();

  return res.json(success({
    accounts: {
      total: accounts.length,
      idle: accounts.filter(a => a.status === 'idle').length,
      in_use: accounts.filter(a => a.status === 'in_use').length,
    },
    keys: {
      total: keys.length,
      active: keys.filter(k => k.status === 'active').length,
      time_mode: keys.filter(k => k.mode === 'time').length,
      switch_mode: keys.filter(k => k.mode === 'switch_count').length,
    },
    assignments: {
      total: assignments.length,
      active: assignments.filter(a => a.status === 'active').length,
    },
  }));
});

app.listen(PORT, () => {
  console.log(`XG-Windsurf backend API server is running on http://localhost:${PORT}`);
});
