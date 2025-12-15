// ==UserScript==
// @name         Universal VLM Picker (Stream & Markdown)
// @namespace    http://tampermonkey.net/
// @version      4.3
// @description  VLM 截图翻译插件：支持流式输出、Markdown 渲染、自定义结果框样式
// @author       Nanaka
// @homepage     https://config.810114.xyz/
// @match        *://*/*
// @connect      *
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/marked/marked.min.js
// @updateURL    https://config.810114.xyz/vlm-tool.user.js
// @downloadURL  https://config.810114.xyz/vlm-tool.user.js
// ==/UserScript==

(function () {
  "use strict";

  const CONFIG_DOMAIN = "config.810114.xyz";

  // =========================================================
  // 0. 默认配置 (含新增的样式配置)
  // =========================================================
  const DEFAULT_CONFIG = {
    // --- 连接设置 ---
    endpoint: "https://api.siliconflow.cn/v1/chat/completions",
    api_key: "",

    // --- 模型参数 ---
    model: "Qwen/Qwen3-VL-32B-Instruct",
    system_prompt:
      "你需要扮演一位从事文化产品的的专业翻译人员，目前将日文文本翻译到中文文本，你需要翻译用户提供的日文内容到中文。\n日文漫画的阅读顺序是从右到左，从上到下。输出内容也应该先右上，后左下。\n在整理语序以及之后的输出时也应如此。\n给出的文本会出现一句话分成多个段落，译文时需要结合上下文，结合多个段落，结合同一个人发言的连贯性，前后句子之间应体现因果逻辑关系。\n也要注意不同人发言的对话性。需要语句通顺，形成前后文的因果逻辑关系，有对话口语风格。\n日文存在在对话中省略前因后果的现象，先推理前因后果，使得逻辑明确之后，再按照事实还原对话内容。\n日文存在在对话中省主语的现象，如果推理有问题，则考虑是否主语有问题。\nエロ漫画中存在较多口语用词，网络用词，粗俗语等。需要识别某些句子是否符合这些条件。\n文本倾向于小说对话内容，使得读者要有代入感。需要明晰对话发生的背景，讲述的内容足够清晰，使用符合语境的用词，充分调动读者的性爱情绪。\n先分析一下发生情景，再在输出文本中给出较为细节的步骤。\n并且翻译出来的文本需要按照一行一列，一段一个气泡的格式输出。并且输出的段落先后顺序符合阅读顺序。\n翻译完成过后，需要进行语言润色。文本倾向于意译，不必完全贴合原文句式，但也要尽力贴合原文表达出的意思，但更着重中文译文文本的阅读体验。\n以上所有内容必须结合图片，以图片内容为准。\n对于每一个对话气泡，翻译的内容必须按照\n日文原文内容\n/\n中文译文\n\n的方式输出，不要添加其他任何格式和原文中不存在的符号。\n并且，每个段落之间应有可分辨的分段信息。\n\n写出完整详细的思考过程，可以包含识别文字，识别口语用语，识别语气词，还原逻辑，纠错文字，补充主语，写出因果关系，补足其他句子成分，调整语序，最终语言润色等步骤。输出格式为纯文本。",
    max_tokens: 4096,
    temperature: 0.6,
    top_p: 0.99,
    top_k: 40,
    min_p: 0,
    frequency_penalty: 1,
    // stream: true, // 强制为 true，不再从配置读取，但保留在逻辑中

    // --- 结果显示框样式 (新增) ---
    box_width: 400, // px
    box_height: 500, // px
    box_font_size: 14, // px
    box_bg_color: "#222222",
    box_text_color: "#eeeeee",
    box_opacity: 0.95,
  };

  // =========================================================
  // 模块 1: 设置页面 (Config Page)
  // =========================================================
  function renderConfigPage() {
    document.documentElement.innerHTML =
      "<head><title>VLM 高级设置</title></head><body></body>";
    document.body.style.backgroundColor = "#f5f7fa";
    document.body.style.fontFamily = "sans-serif";
    document.body.style.margin = "0";
    document.body.style.padding = "40px 0";

    const storedConfig = GM_getValue("vlm_full_config", {});
    const config = { ...DEFAULT_CONFIG, ...storedConfig };

    const style = document.createElement("style");
    style.textContent = `
            .config-container { max-width: 700px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.08); }
            h2 { margin-top: 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px; }
            .section-title { font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin: 25px 0 10px 0; font-weight: bold; border-left: 4px solid #2196F3; padding-left: 10px; }
            .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .full-width { grid-column: span 2; }
            .form-group { margin-bottom: 5px; }
            label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #444; }
            input[type="text"], input[type="number"], input[type="password"], input[type="color"], textarea {
                width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; font-size: 14px; transition: border 0.2s;
            }
            input:focus, textarea:focus { border-color: #2196F3; outline: none; }
            textarea { resize: vertical; min-height: 80px; font-family: monospace; }
            .btn-container { margin-top: 30px; display: flex; justify-content: flex-end; gap: 10px; border-top: 2px solid #f0f0f0; padding-top: 20px; }
            .btn { padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; }
            .btn-save { background-color: #4CAF50; color: white; }
            .btn-save:hover { background-color: #43a047; }
            .btn-reset { background-color: #f44336; color: white; }
            .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #333; color: white; padding: 10px 20px; border-radius: 30px; opacity: 0; transition: opacity 0.3s; }
        `;
    document.head.appendChild(style);

    const container = document.createElement("div");
    container.className = "config-container";

    const mkInput = (label, key, type = "text", step = "") => `
            <div class="form-group ${type === "textarea" ? "full-width" : ""}">
                <label>${label}</label>
                ${
                  type === "textarea"
                    ? `<textarea id="cfg_${key}">${config[key]}</textarea>`
                    : `<input type="${type}" id="cfg_${key}" value="${
                        config[key]
                      }" ${step ? `step="${step}"` : ""}>`
                }
            </div>
        `;

    container.innerHTML = `
            <h2>🧩 VLM 插件设置</h2>

            <div class="section-title">连接设置</div>
            <div class="form-grid">
                <div class="full-width">${mkInput(
                  "API Endpoint",
                  "endpoint"
                )}</div>
                <div class="full-width">${mkInput(
                  "API Key",
                  "api_key",
                  "password"
                )}</div>
                 <label><a href="https://cloud.siliconflow.cn/i/sRO0U8o0">没有的话点我注册硅基流动(w/aff)</a> </label>
            </div>

            <div class="section-title">模型参数</div>
            <div class="form-grid">
                <div class="full-width">${mkInput("Model Name", "model")}</div>
                ${mkInput("System Prompt", "system_prompt", "textarea")}
            </div>

            <div class="section-title">生成参数</div>
            <div class="form-grid">
                ${mkInput("Max Tokens", "max_tokens", "number")}
                ${mkInput("Temperature", "temperature", "number", "0.1")}
                ${mkInput("Top P", "top_p", "number", "0.01")}
                ${mkInput("Top K", "top_k", "number")}
                ${mkInput("Min P", "min_p", "number", "0.01")}
                ${mkInput(
                  "Frequency Penalty",
                  "frequency_penalty",
                  "number",
                  "0.1"
                )}
                <div class="full-width" style="color: #666; font-size: 12px; padding: 5px 0;">* Stream 模式已强制启用，无需设置。</div>
            </div>

            <div class="section-title">结果显示框样式</div>
            <div class="form-grid">
                ${mkInput("宽度 (px)", "box_width", "number")}
                ${mkInput("高度 (px)", "box_height", "number")}
                ${mkInput("字体大小 (px)", "box_font_size", "number")}
                ${mkInput("背景颜色", "box_bg_color", "color")}
                ${mkInput("文字颜色", "box_text_color", "color")}
                ${mkInput("不透明度 (0-1)", "box_opacity", "number", "0.1")}
            </div>

            <div class="btn-container">
                <button id="btn-reset" class="btn btn-reset">重置默认</button>
                <button id="btn-save" class="btn btn-save">保存配置</button>
            </div>
        `;

    document.body.appendChild(container);

    const toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
    const showMsg = (msg) => {
      toast.textContent = msg;
      toast.style.opacity = "1";
      setTimeout(() => (toast.style.opacity = "0"), 2000);
    };

    document.getElementById("btn-save").onclick = () => {
      const newConfig = { ...config };
      for (const key in DEFAULT_CONFIG) {
        const el = document.getElementById(`cfg_${key}`);
        if (!el) continue;
        if (el.type === "number") newConfig[key] = parseFloat(el.value);
        else newConfig[key] = el.value;
      }
      GM_setValue("vlm_full_config", newConfig);
      showMsg("✅ 配置已保存");
    };

    document.getElementById("btn-reset").onclick = () => {
      if (confirm("确定要恢复默认设置吗？")) {
        GM_setValue("vlm_full_config", DEFAULT_CONFIG);
        location.reload();
      }
    };
  }

  // =========================================================
  // 模块 2: 结果显示框 (Display Box) - 支持 Markdown
  // =========================================================
  const DisplayBox = {
    element: null,
    contentElement: null,

    init: function () {
      if (this.element) return;
      // 创建容器
      this.element = document.createElement("div");
      this.element.id = "vlm-result-box";

      // 创建标题栏/关闭按钮
      const header = document.createElement("div");
      header.style.cssText =
        "display: flex; justify-content: space-between; align-items: left; padding: 5px 10px; background: rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); cursor: move;";
      header.innerHTML =
        '<span style="font-size:12px; font-weight:bold;">🤖 VLM Response</span>';

      const closeBtn = document.createElement("span");
      closeBtn.textContent = "✖";
      closeBtn.style.cssText = "cursor: pointer; font-size: 14px;";
      closeBtn.onclick = () => this.hide();
      header.appendChild(closeBtn);

      this.element.appendChild(header);

      // 创建内容区域
      this.contentElement = document.createElement("div");
      this.contentElement.className = "vlm-markdown-content";
      this.contentElement.style.cssText =
        "padding: 10px; overflow-y: auto; height: calc(100% - 30px);";
      this.element.appendChild(this.contentElement);

      document.body.appendChild(this.element);

      // 拖拽逻辑 (简单实现)
      let isDragging = false,
        startX,
        startY,
        startLeft,
        startTop;
      header.onmousedown = (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = this.element.offsetLeft;
        startTop = this.element.offsetTop;
        e.preventDefault();
      };
      document.onmousemove = (e) => {
        if (isDragging) {
          this.element.style.left = startLeft + e.clientX - startX + "px";
          this.element.style.top = startTop + e.clientY - startY + "px";
        }
      };
      document.onmouseup = () => (isDragging = false);
    },

    applyConfig: function (config) {
      if (!this.element) this.init();

      // 应用 Config 中的样式
      this.element.style.position = "fixed";
      this.element.style.zIndex = "2147483647";
      this.element.style.width = config.box_width + "px";
      this.element.style.height = config.box_height + "px";
      this.element.style.backgroundColor = config.box_bg_color;
      this.element.style.color = config.box_text_color;
      this.element.style.fontSize = config.box_font_size + "px";
      this.element.style.opacity = config.box_opacity;
      this.element.style.borderRadius = "8px";
      this.element.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
      this.element.style.display = "none"; // 默认隐藏
      this.element.style.backdropFilter = "blur(5px)";
      // 修正
      this.element.style.textAlign = "left";  // 添加这一行

      // 设置 Markdown 样式
      const css = `
                .vlm-markdown-content p { margin: 0 0 10px 0; line-height: 1.5; }
                .vlm-markdown-content strong { color: #4fc3f7; }
                .vlm-markdown-content code { background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace; }
                .vlm-markdown-content pre { background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; overflow-x: auto; }
                .vlm-markdown-content ul, .vlm-markdown-content ol { padding-left: 20px; }
                .vlm-markdown-content hr { border: 0; border-top: 1px solid rgba(255,255,255,0.2); margin: 10px 0; }
            `;
      let styleTag = document.getElementById("vlm-md-style");
      if (!styleTag) {
        styleTag = document.createElement("style");
        styleTag.id = "vlm-md-style";
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = css;
    },

    show: function (fabRect, config) {
      this.applyConfig(config);

      // 计算位置：悬浮球上方左侧
      // 假设悬浮球在右下角，我们把框放在球的左上方向
      // Left = 球的Left - 框宽 - 间距
      // Top = 球的Top - 框高 - 间距
      const gap = 20;
      let left = fabRect.left - config.box_width - gap;
      let top = fabRect.top - config.box_height + fabRect.height; // 底部对齐一点

      // 简单边界检查
      if (left < 10) left = 10;
      if (top < 10) top = 10;

      this.element.style.left = left + "px";
      this.element.style.top = top + "px";
      this.element.style.display = "block";
      this.contentElement.innerHTML =
        '<div style="opacity:0.6;">⏳ Waiting for stream...</div>';
      this.contentElement.scrollTop = 0;
    },

    updateContent: function (markdownText) {
      if (!this.contentElement) return;
      // 使用 marked 解析 Markdown
      const html = marked.parse(markdownText);
      this.contentElement.innerHTML = html;
      // 自动滚动到底部
      this.contentElement.scrollTop = this.contentElement.scrollHeight;
    },

    hide: function () {
      if (this.element) this.element.style.display = "none";
    },
  };

  // =========================================================
  // 模块 3: 核心逻辑 (Picker, Image, Network)
  // =========================================================

  function injectStyles() {
    if (document.getElementById("vlm-vanilla-styles")) return;
    const css = `
            #vlm-fab { position: fixed; width: 50px; height: 50px; background: #333; color: white; border-radius: 50%; z-index: 2147483646; display: flex; align-items: left; justify-content: center; cursor: pointer; font-size: 24px; border: 2px solid rgba(255,255,255,0.2); transition: transform 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
            #vlm-fab:hover { transform: scale(1.05); }
            #vlm-fab.active { background-color: #F44336; border-color: white; }
            #vlm-fab.processing { background-color: #FF9800; cursor: wait; }
            .vlm-picking-mode { cursor: crosshair !important; }
            .vlm-target-highlight { outline: 5px solid #F44336 !important; outline-offset: -2px; z-index: 2147483645; }
        `;
    const style = document.createElement("style");
    style.id = "vlm-vanilla-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  const ImageProcessor = {
    convertToWebP: function (srcUrl) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url: srcUrl,
          responseType: "blob",
          onload: function (response) {
            if (response.status === 200) {
              const blob = response.response;
              const img = new Image();
              img.onload = function () {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0);
                try {
                  const base64 = canvas.toDataURL("image/webp", 0.8);
                  URL.revokeObjectURL(img.src);
                  resolve(base64);
                } catch (e) {
                  reject(e);
                }
              };
              img.onerror = () => reject(new Error("Image load failed"));
              img.src = URL.createObjectURL(blob);
            } else {
              reject(new Error("Download failed: " + response.status));
            }
          },
          onerror: (err) => reject(err),
        });
      });
    },
  };

  // --- SSE 请求处理 (Native Fetch Version) ---
  async function sendStreamRequest(config, base64Image) {
    // 1. 构造 Payload
    const payload = {
      model: config.model,
      max_tokens: config.max_tokens,
      temperature: config.temperature,
      top_p: config.top_p,
      top_k: config.top_k,
      min_p: config.min_p,
      frequency_penalty: config.frequency_penalty,
      stream: true,
      messages: [
        { role: "system", content: config.system_prompt },
        {
          role: "user",
          content: [{ type: "image_url", image_url: { url: base64Image } }],
        },
      ],
    };

    let currentContent = ""; // 用于累积 Markdown 文本
    let buffer = ""; // 用于缓存未传输完整的行

    try {
      // 2. 发起 Fetch 请求
      const response = await fetch(config.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.api_key}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      // 3. 建立流式读取器
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      // 4. 循环读取流
      while (true) {
        const { done, value } = await reader.read();

        if (done) break; // 读取完毕

        // 解码当前数据块 (Uint8Array -> String)
        // { stream: true } 选项保持解码器的内部状态，防止多字节字符被切断
        const chunk = decoder.decode(value, { stream: true });

        // 拼接到缓存中
        buffer += chunk;

        // 按行分割 (SSE 协议以换行符分隔)
        const lines = buffer.split("\n");

        // 保存最后一行（因为它可能不完整，属于下一个数据包的一部分）
        buffer = lines.pop();

        // 处理完整的行
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // 识别 data: 开头的行
          if (trimmed.startsWith("data: ")) {
            const jsonStr = trimmed.slice(6); // 去掉 "data: "

            if (jsonStr === "[DONE]") continue; // 结束标志

            try {
              const json = JSON.parse(jsonStr);

              // 健壮性检查：确保 choices 存在且有内容
              if (
                json.choices &&
                Array.isArray(json.choices) &&
                json.choices.length > 0
              ) {
                const delta = json.choices[0].delta;
                // 检查 content 是否存在（有时 delta 是空的或者是 role 字段）
                if (delta && delta.content) {
                  currentContent += delta.content;
                  // 实时渲染 Markdown
                  DisplayBox.updateContent(currentContent);
                }
              }
            } catch (e) {
              console.warn("JSON Parse Error:", e, "Line:", trimmed);
            }
          }
        }
      }

      console.log("Stream finished successfully.");
    } catch (err) {
      console.error("Fetch Error:", err);
      DisplayBox.updateContent(`**Network Error:** ${err.message}`);
    } finally {
      // 无论成功还是失败，都重置按钮状态
      Picker.updateBtnState("idle", "👁️");
      Picker.isProcessing = false;
    }
  }
  const Picker = {
    isActive: false,
    isProcessing: false,
    enable: function () {
      if (this.isActive) return;
      this.isActive = true;
      document.body.classList.add("vlm-picking-mode");
      document.addEventListener("mouseover", this.handleOver, true);
      document.addEventListener("mouseout", this.handleOut, true);
      document.addEventListener("click", this.handleClick, true);
      this.updateBtnState("active", "🎯");
    },
    disable: function () {
      if (!this.isActive) return;
      this.isActive = false;
      document.body.classList.remove("vlm-picking-mode");
      document.removeEventListener("mouseover", this.handleOver, true);
      document.removeEventListener("mouseout", this.handleOut, true);
      document.removeEventListener("click", this.handleClick, true);
      document
        .querySelectorAll(".vlm-target-highlight")
        .forEach((el) => el.classList.remove("vlm-target-highlight"));
      this.updateBtnState("idle", "👁️");
    },
    updateBtnState: function (state, icon) {
      const btn = document.getElementById("vlm-fab");
      if (btn) {
        btn.className = "";
        if (state === "active") btn.classList.add("active");
        if (state === "processing") btn.classList.add("processing");
        btn.textContent = icon;
      }
    },
    handleOver: function (e) {
      if (e.target.tagName === "IMG")
        e.target.classList.add("vlm-target-highlight");
    },
    handleOut: function (e) {
      if (e.target.tagName === "IMG")
        e.target.classList.remove("vlm-target-highlight");
    },
    handleClick: function (e) {
      if (
        e.target.id === "vlm-fab" ||
        e.target.closest("#vlm-fab") ||
        e.target.closest("#vlm-result-box")
      )
        return;
      e.preventDefault();
      e.stopPropagation();

      if (e.target.tagName === "IMG") {
        if (Picker.isProcessing) return;

        // 读取配置
        const storedConfig = GM_getValue("vlm_full_config", {});
        const config = { ...DEFAULT_CONFIG, ...storedConfig };

        const src = e.target.src;
        Picker.isProcessing = true;
        Picker.updateBtnState("processing", "⏳");

        // 显示结果框
        const fab = document.getElementById("vlm-fab");
        const fabRect = fab.getBoundingClientRect();
        DisplayBox.show(fabRect, config);

        ImageProcessor.convertToWebP(src)
          .then((base64) => {
            sendStreamRequest(config, base64);
          })
          .catch((err) => {
            DisplayBox.updateContent(
              `**Error Processing Image:** ${err.message}`
            );
            Picker.isProcessing = false;
            Picker.updateBtnState("idle", "👁️");
          });

        e.target.classList.remove("vlm-target-highlight");
        Picker.disable(); // 选中后退出取景模式
      } else {
        Picker.disable();
      }
    },
  };

  function createFloatingButton() {
    const fab = document.createElement("div");
    fab.id = "vlm-fab";
    fab.textContent = "👁️";
    fab.title = "点击开始取景";
    fab.style.left = window.innerWidth - 80 + "px";
    fab.style.top = window.innerHeight - 100 + "px";
    document.body.appendChild(fab);

    let isDragging = false,
      startX,
      startY,
      initialLeft,
      initialTop;

    fab.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = fab.offsetLeft;
      initialTop = fab.offsetTop;
      e.preventDefault();
    });
    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      fab.style.left = initialLeft + e.clientX - startX + "px";
      fab.style.top = initialTop + e.clientY - startY + "px";
    });
    window.addEventListener("mouseup", (e) => {
      if (!isDragging) return;
      isDragging = false;
      // 区分点击和拖拽
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < 5) {
        if (!Picker.isProcessing)
          Picker.isActive ? Picker.disable() : Picker.enable();
      }
    });
  }

  // =========================================================
  // 主入口 (Main)
  // =========================================================
  function init() {
    if (location.hostname === CONFIG_DOMAIN) {
      renderConfigPage();
      return;
    }

    injectStyles();
    if (document.body) {
      createFloatingButton();
    } else {
      window.addEventListener("DOMContentLoaded", createFloatingButton);
    }
  }

  init();
})();
