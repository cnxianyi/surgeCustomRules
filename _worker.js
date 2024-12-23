export default {
  async fetch(request, env, ctx) {
    let url;
    url = new URL(request.url);

    const { pathname, searchParams } = url;
    const DATABASE = env.DATABASE;

    const rule = searchParams.get("rule") || "direct";

    switch (pathname) {
      case "/": {
        if (searchParams.has("rule")) {
          return new Response(home(rule), {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        } else {
          const baseUrl = url.origin;
          return Response.redirect(
            `${baseUrl}/?rule=${encodeURIComponent(rule)}`,
            302
          );
        }
      }

      case "/rule":
        return getRules(DATABASE, rule);

      case "/insert": {
        if (request.method === "GET") {
          const rules = searchParams.get("rules");
          const ruleType = searchParams.get("ruleType") || rule;

          if (!rules) {
            return new Response("规则不能为空", { status: 400 });
          }

          return await insertDb(DATABASE, ruleType, rules);
        } else {
          return new Response("Method Not Allowed", { status: 405 });
        }
      }

      case "/get-rule-types":
        return await getRuleTypes(DATABASE);

      case "/rule-list":
        return await ruleList(DATABASE);

      case "/delete-rule":
        return await deleteRule(DATABASE, searchParams);

      default:
        return new Response("Not Found", { status: 404 });
    }
  },
};

// 获取不同规则类型的函数
async function getRuleTypes(DATABASE) {
  try {
    // 获取规则表中所有不同的规则类型
    const { results } = await DATABASE.prepare(
      "SELECT DISTINCT rule FROM rules"
    ).all();

    const ruleTypes = results.map((row) => row.rule);

    return new Response(JSON.stringify(ruleTypes), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching rule types:", err);
    return new Response("Error fetching rule types: " + err.message, {
      status: 500,
    });
  }
}

// 获取规则列表并生成 HTML 链接和删除按钮
async function ruleList(DATABASE) {
  try {
    const { results } = await DATABASE.prepare(
      "SELECT DISTINCT rule FROM rules"
    ).all();

    if (results.length === 0) {
      return new Response("没有找到任何规则类型。", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    let html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>规则列表</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 0;
                  background-color: #f8f9fa;
                  color: #343a40;
              }
              header {
                  background-color: #007bff;
                  color: white;
                  padding: 10px 20px;
                  text-align: center;
              }
              main {
                  padding: 20px;
              }
              ul {
                  list-style-type: none;
                  padding: 0;
              }
              li {
                  margin: 10px 0;
                  display: flex;
                  align-items: center;
              }
              a {
                  color: #007bff;
                  text-decoration: none;
                  font-size: 18px;
                  flex-grow: 1;
              }
              a:hover {
                  color: #0056b3;
                  text-decoration: underline;
              }
              button {
                  background-color: #dc3545;
                  color: white;
                  border: none;
                  padding: 5px 10px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 14px;
              }
              button:hover {
                  background-color: #c82333;
              }
              footer {
                  margin-top: 20px;
                  text-align: center;
                  color: #868e96;
                  font-size: 14px;
              }
          </style>
      </head>
      <body>
          <header>
              <h1>规则列表</h1>
          </header>
          <main>
              <ul>
    `;

    for (const row of results) {
      html += `<li>
                <a href="/rule?rule=${encodeURIComponent(row.rule)}">${sanitize(
        row.rule
      )}</a>
                <button onclick="deleteRule('${sanitize(
                  row.rule
                )}')">删除</button>
              </li>\n`;
    }

    html += `
              </ul><hr>
              <p><a href="/">返回主页</a></p>
          </main>
          <footer>
              <p>&copy; 2024 Surge Rule Manager</p>
          </footer>
          <script>
        
              async function deleteRule(ruleType) {
                  if (!confirm('确定要删除规则类型 "' + ruleType + '" 及其所有规则吗？')) {
                      return;
                  }

                  try {
                      const response = await fetch('/delete-rule?rule=' + encodeURIComponent(ruleType), {
                          method: 'GET'
                      });

                      if (response.ok) {
                          const result = await response.text();
                          alert(result);
                      
                          window.location.reload();
                      } else {
                          const errorText = await response.text();
                          alert('删除失败：' + errorText);
                      }
                  } catch (err) {
                      alert('删除失败：' + err.message);
                  }
              }
          </script>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("Error fetching rule list:", err);
    return new Response("Error fetching rule list: " + err.message, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

// 删除规则类型及其所有规则
async function deleteRule(DATABASE, searchParams) {
  const ruleType = searchParams.get("rule");
  if (!ruleType) {
    return new Response("未指定要删除的规则类型。", { status: 400 });
  }

  try {
    // 直接使用 D1 的 prepare 和 run 方法
    const stmt = DATABASE.prepare("DELETE FROM rules WHERE rule = ?");
    await stmt.bind(ruleType).run();

    return new Response(`规则类型 "${ruleType}" 及其所有规则已成功删除。`, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("Error deleting rule type:", err);
    return new Response("删除规则类型时出错：" + err.message, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

// 获取规则内容的函数
async function getRules(DATABASE, rule) {
  try {
    // 执行查询：根据规则获取对应的内容
    const { results } = await DATABASE.prepare(
      "SELECT * FROM rules WHERE rule = ?"
    )
      .bind(rule)
      .all();

    if (results.length === 0) {
      return new Response("未找到指定规则类型的任何规则。", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    let s = "";

    for (let i = 0; i < results.length; i++) {
      s += results[i].url;
      s += "\n";
    }

    // 返回查询结果作为响应
    return new Response(s, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    // 捕获并返回错误信息
    console.error(err);
    return new Response("查询数据库时出错：" + err.message, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

// 插入规则到数据库的函数
async function insertDb(DATABASE, ruleType, rules) {
  try {
    // 按换行符分隔规则
    const lines = rules.split("\n");

    // 初始化插入成功的记录
    const insertedRules = [];

    for (let line of lines) {
      // 去除每行的前后空白字符
      line = line.trim();

      // 跳过空行
      if (!line) continue;

      let ruleLine;

      if (line.includes(",")) {
        // 如果行中包含逗号，直接使用该行内容
        ruleLine = line;
      } else {
        // 如果行中不包含逗号，自动添加 "DOMAIN," 前缀
        ruleLine = `DOMAIN,${line}`;
      }

      if (ruleLine) {
        // 确保规则行非空
        const result = await DATABASE.prepare(
          `INSERT OR IGNORE INTO rules (rule, url) VALUES (?, ?);`
        )
          .bind(ruleType, ruleLine)
          .run();

        // 如果插入成功（不为重复数据）
        if (result.success !== false) {
          insertedRules.push(ruleLine);
        }
      }
    }

    if (insertedRules.length === 0) {
      return new Response("没有新的规则被插入。", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // 构造返回消息
    let responseMessage = `${ruleType} 规则插入:\n`;
    for (const ruleLine of insertedRules) {
      responseMessage += `${ruleLine}\n`;
    }

    return new Response(responseMessage, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("Error inserting into database:", err);
    return new Response("插入数据库时出错：" + err.message, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

// Home 页面
function home(rule) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>surgeCustomRules</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f8f9fa;
                color: #343a40;
            }
            header {
                background-color: #007bff;
                color: white;
                padding: 10px 20px;
                text-align: center;
            }
            main {
                padding: 20px;
            }
            h3 {
                display: inline;
                color: #007bff;
                cursor: pointer;
                text-decoration: underline;
            }
            h3:hover {
                color: #0056b3;
            }
            .separator {
                color: #6c757d;
                margin: 0 10px;
            }
            form {
                background-color: white;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            textarea {
                width: 100%;
                padding: 10px;
                margin-bottom: 10px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                font-size: 16px;
            }
            button {
                background-color: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
            }
            button:hover {
                background-color: #0056b3;
            }
            #result {
                margin-top: 20px;
                padding: 10px;
                background-color: #e9ecef;
                border-radius: 4px;
                font-size: 14px;
                white-space: pre-wrap;
            }
            footer {
                margin-top: 20px;
                text-align: center;
                color: #868e96;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <header>
            <h1>SurgeCustomRules</h1>
            <p>轻松管理规则</p>
        </header>
        <main>
            <h3 id="viewCurrentRules">查看当前规则</h3>
            <span class="separator">|</span>
            <h3 id="viewRuleList">查看规则列表</h3>
            <form id="ruleForm">
                <label for="ruleType">规则类型:</label>
                <input type="text" id="ruleType" name="ruleType" placeholder="默认: direct" value="${sanitize(
                  rule
                )}" />
                <textarea
                    id="rulesInput"
                    name="rules"
                    rows="5"
                    cols="30"
                    placeholder="请输入规则，每行一个。可以选择是否添加 'DOMAIN,' 前缀。"></textarea>
                <button type="button" id="submitButton">提交规则</button>
            </form>
            <div id="result">提交结果将在此显示</div>
        </main>
        <footer>
            <p>&copy; 2024 SurgeCustomRules</p>
        </footer>
        <script>
            // 点击 "查看当前规则" 保持当前规则参数并刷新主页
            document.getElementById('viewCurrentRules').addEventListener('click', () => {
                const ruleType = document.getElementById('ruleType').value.trim() || 'direct';
                console.log(ruleType);
                window.location.href = '/rule?rule=' + encodeURIComponent(ruleType);
            });

            // 点击 "查看规则列表" 跳转到 /rule-list
            document.getElementById('viewRuleList').addEventListener('click', () => {
                window.location.href = '/rule-list';
            });

            // 监听提交按钮
            document.getElementById('submitButton').addEventListener('click', async () => {
                const rules = document.getElementById('rulesInput').value.trim();
                const ruleType = document.getElementById('ruleType').value.trim() || 'direct';

                if (!rules) {
                    document.getElementById('result').textContent = '规则不能为空！';
                    return;
                }

                try {
                    // 异步提交表单数据到后端
                    const response = await fetch('/insert?rules=' + encodeURIComponent(rules) + '&ruleType=' + encodeURIComponent(ruleType), {
                        method: 'GET'
                    });

                    if (response.ok) {
                        const result = await response.text();
                        // 显示提交结果
                        document.getElementById('result').textContent = result;
                        // 清空规则输入框
                        document.getElementById('rulesInput').value = '';
                    } else {
                        const errorText = await response.text();
                        document.getElementById('result').textContent = '提交失败：' + errorText;
                    }
                } catch (err) {
                    // 显示错误信息
                    document.getElementById('result').textContent = '提交失败：' + err.message;
                }
            });
        </script>
    </body>
    </html>
  `;
}

// 防止 XSS，通过转义特殊字符
function sanitize(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
