# Nginx 部署说明

## 1. 构建和上传

本地执行：

```bash
npm run build:server
./deploy.local.sh
```

服务器静态目录：

```text
/usr/share/nginx/html/chessclass
```

## 2. 准备证书

配置假设 Let’s Encrypt 证书目录为：

```text
/etc/letsencrypt/live/chess9527.com/
```

证书必须同时覆盖：

```text
chess9527.com
www.chess9527.com
chess9527.online
www.chess9527.online
```

如果使用 Cloudflare Origin CA，先把 `chess9527.conf` 中的两个证书路径改成实际 `.pem` 和私钥路径，再执行 Nginx 检查。

## 3. 安装配置

根据服务器 Nginx 的目录结构，选择 `/etc/nginx/conf.d/` 或 `sites-available/sites-enabled`：

```bash
scp deploy/nginx/chess9527.conf ali.online:/tmp/chess9527.conf
ssh ali.online
sudo cp /tmp/chess9527.conf /etc/nginx/conf.d/chess9527.conf
sudo nginx -t
sudo systemctl reload nginx
```

只有 `sudo nginx -t` 成功后才能 reload。如果证书尚未准备好，先不要复制这份 HTTPS 配置。

## 4. Cloudflare

- 四个主机名使用橙色云代理。
- SSL/TLS 模式设为 `Full (strict)`。
- `.online` 和两个 `www` 域名由 Nginx 301 跳转到 `https://chess9527.com`。
- 日志中的 `country` 来自 Cloudflare `CF-IPCountry` 请求头。只有源站限制为 Cloudflare 回源后，该值才可作为可信的粗略国家代码。

当前配置不会信任或改写 `$remote_addr`，所以 access log 中默认记录 Cloudflare 节点 IP。若以后需要记录真实访问 IP，必须先配置并维护 Cloudflare 官方 IP 段，再启用 `real_ip_header CF-Connecting-IP`；不应直接信任公网来源提交的该请求头。
