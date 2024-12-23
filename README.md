# 介绍

基于 Cloudflare D1&worker 的surge规则服务

用于管理需要自行维护的规则分类

## 功能

- 添加规则
- 获取规则
- 支持多规则分类
- 支持删除规则分类

![alt](https://xianyi-img.eu.org/1734927306145.png)

![alt](https://xianyi-img.eu.org/1734927353039.png)

![alt](https://xianyi-img.eu.org/1734927419897.png)

- 支持多行&自定义前缀

```bash
www.baidu.com
AND,((DOMAIN-SUFFIX,baidu.com), (PROCESS-NAME,app))
```

## 部署

1. 创建 D1 数据库
    1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
    2. 进入 `Workers & Pages` → `D1 SQL 数据库`
    3. 点击 `创建` 创建数据库
    - 数据库名称可自定义，例如 `images`
    - 建议选择数据库位置为 `亚太地区`，可以获得更好的访问速度
    4. 创建数据表:
    - 点击数据库名称进入详情页
    - 选择 `控制台` 标签
    - 执行以下 SQL 语句:
    ```sql
    CREATE TABLE rules (
        rule TEXT,
        url TEXT,
        PRIMARY KEY (rule, url)
    );
    ```
2. 创建 Worker
    1. 进入 `Workers & Pages`
    2. 点击 `创建`
    3. 选择 `创建 Worker`
    4. 为 Worker 设置一个名称
    5. 点击 `部署` 创建 Worker
    6. 点击继续处理项目
3. 添加D1
    1. 进入创建的Workers & Pages
    2. 进入设置
    3. 绑定
        - 添加D1数据库