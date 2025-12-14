# Windows 服务器部署指南

## 一、服务器环境准备

### 1. 安装 Node.js
下载并安装 Node.js LTS 版本：https://nodejs.org/
安装完成后，打开 PowerShell 验证：
```powershell
node -v
npm -v
```

### 2. 安装 PM2（进程管理器）
```powershell
npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
```

---

## 二、上传项目文件

### 方式一：直接复制
将整个 `backend` 文件夹复制到服务器，例如：
```
C:\xg-windsurf-api\
```

### 方式二：Git 克隆（如果项目在 Git 仓库）
```powershell
cd C:\
git clone <你的仓库地址> xg-windsurf-api
cd xg-windsurf-api\backend
```

---

## 三、安装依赖并启动

```powershell
cd C:\xg-windsurf-api
npm install
pm2 start ecosystem.config.js
pm2 save
```

验证服务是否运行：
```powershell
pm2 list
# 访问 http://localhost:3000/api/announcements 应该返回 JSON
```

---

## 四、配置 Nginx 反向代理 + HTTPS

### 1. 下载 Nginx for Windows
https://nginx.org/en/download.html

解压到 `C:\nginx`

### 2. 配置 nginx.conf
编辑 `C:\nginx\conf\nginx.conf`，替换为：

```nginx
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    keepalive_timeout  65;

    # HTTP -> HTTPS 重定向
    server {
        listen 80;
        server_name api.haiio.xyz;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS 配置
    server {
        listen 443 ssl;
        server_name api.haiio.xyz;

        # SSL 证书路径（需要替换为实际路径）
        ssl_certificate      C:/nginx/ssl/api.haiio.xyz.pem;
        ssl_certificate_key  C:/nginx/ssl/api.haiio.xyz.key;

        ssl_session_cache    shared:SSL:1m;
        ssl_session_timeout  5m;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers  HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers  on;

        location / {
            proxy_pass http://127.0.0.1:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### 3. 获取 SSL 证书
推荐使用免费证书：
- **阿里云免费证书**：https://yundun.console.aliyun.com/
- **腾讯云免费证书**：https://console.cloud.tencent.com/ssl
- **Let's Encrypt**（需要工具）

下载证书后放到 `C:\nginx\ssl\` 目录

### 4. 启动 Nginx
```powershell
cd C:\nginx
start nginx
```

验证：
```powershell
# 检查 Nginx 是否运行
tasklist /fi "imagename eq nginx.exe"
```

---

## 五、防火墙配置

确保服务器防火墙开放 80 和 443 端口：
```powershell
netsh advfirewall firewall add rule name="HTTP" dir=in action=allow protocol=tcp localport=80
netsh advfirewall firewall add rule name="HTTPS" dir=in action=allow protocol=tcp localport=443
```

---

## 六、域名 DNS 配置

在你的域名服务商处添加 A 记录：
- **主机记录**：`api`
- **记录类型**：A
- **记录值**：你的服务器公网 IP

---

## 七、验证部署

浏览器访问：
```
https://api.haiio.xyz/api/announcements
```

应该返回：
```json
{"code":0,"message":"success","data":{"announcements":[...],"total":1}}
```

---

## 常用命令

```powershell
# 查看 PM2 进程
pm2 list

# 查看日志
pm2 logs xg-windsurf-api

# 重启服务
pm2 restart xg-windsurf-api

# 停止服务
pm2 stop xg-windsurf-api

# 重新加载 Nginx 配置
cd C:\nginx
nginx -s reload
```
