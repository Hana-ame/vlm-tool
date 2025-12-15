// ==UserScript==
// @name         Universal VLM Picker
// @namespace    http://tampermonkey.net/
// @version      5.2
// @description  VLM 截图翻译插件：强力 Base64 模式、支持直链/代理模式、移动端适配、思考过程显示
// @author       Nanaka & Gemini 3 Pro
// @homepage     https://config.810114.xyz/
// @match        *://*/*
// @connect      *
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/marked/marked.min.js
// @updateURL    https://config.810114.xyz/vlm-tool.user.js
// @downloadURL  https://config.810114.xyz/vlm-tool.user.js
// ==/UserScript==

(function () {
  "use strict";

  const CONFIG_DOMAIN = "config.810114.xyz";

  // =========================================================
  // 0. 默认配置
  // =========================================================
  const DEFAULT_CONFIG = {
    // --- 连接设置 ---
    endpoint: "https://api.siliconflow.cn/v1/chat/completions",
    api_key: "",

    // --- 图片传输模式 ---
    // 'base64': 强力模式 (Canvas + GM_xhr)，兼容性最强
    // 'url': 直链模式
    // 'proxy': 代理模式
    image_mode: "base64",

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

    // --- 结果显示框样式 ---
    box_width: 400,
    box_height: 500,
    box_font_size: 14,
    box_bg_color: "#222222",
    box_text_color: "#eeeeee",
    box_opacity: 0.95,
  };

  // =========================================================
  // 辅助函数：优化版通用拖拽
  // =========================================================
  function enableDrag(element, handle, onTap) {
    let startX, startY, initLeft, initTop;
    let isDragging = false;
    const TOUCH_THRESHOLD = 10;
    const MOUSE_THRESHOLD = 5;

    // Mouse
    handle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      initLeft = element.offsetLeft;
      initTop = element.offsetTop;

      const onMove = (mv) => {
        const dx = mv.clientX - startX;
        const dy = mv.clientY - startY;
        if (Math.abs(dx) > MOUSE_THRESHOLD || Math.abs(dy) > MOUSE_THRESHOLD) {
          isDragging = true;
        }
        if (isDragging) {
          element.style.left = initLeft + dx + "px";
          element.style.top = initTop + dy + "px";
        }
      };

      const onUp = (up) => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        if (!isDragging && onTap) {
          onTap(up);
        }
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });

    // Touch
    handle.addEventListener("touchstart", (e) => {
      if (e.touches.length > 1) return;
      isDragging = false;
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      initLeft = element.offsetLeft;
      initTop = element.offsetTop;
    }, { passive: false });

    handle.addEventListener("touchmove", (e) => {
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (!isDragging && (Math.abs(dx) > TOUCH_THRESHOLD || Math.abs(dy) > TOUCH_THRESHOLD)) {
        isDragging = true;
      }
      if (isDragging) {
        if (e.cancelable) e.preventDefault();
        element.style.left = initLeft + dx + "px";
        element.style.top = initTop + dy + "px";
      }
    }, { passive: false });

    handle.addEventListener("touchend", (e) => {
      if (!isDragging) {
        if (onTap) {
          onTap(e);
          if (e.cancelable) e.preventDefault();
        }
      }
      isDragging = false;
    }, { passive: false });
  }

  // =========================================================
  // 模块 1: 设置页面 (Config Page)
  // =========================================================
  function renderConfigPage() {
    document.documentElement.innerHTML = "<head><title>VLM 高级设置</title></head><body></body>";
    document.body.style.backgroundColor = "#f5f7fa";
    document.body.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    document.body.style.margin = "0";
    document.body.style.padding = "20px 0";

    const storedConfig = GM_getValue("vlm_full_config", {});
    const config = { ...DEFAULT_CONFIG, ...storedConfig };

    const style = document.createElement("style");
    style.textContent = `
            .config-container { max-width: 700px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.08); }
            h2 { margin-top: 0; color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px; }
            .alert-box {
                background-color: #ffebee;
                border: 1px solid #ffcdd2;
                color: #c62828;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 25px;
                text-align: center;
                font-weight: bold;
                font-size: 16px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(255, 82, 82, 0.4); }
                70% { box-shadow: 0 0 0 10px rgba(255, 82, 82, 0); }
                100% { box-shadow: 0 0 0 0 rgba(255, 82, 82, 0); }
            }
            .section-title { font-size: 14px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin: 25px 0 10px 0; font-weight: bold; border-left: 4px solid #2196F3; padding-left: 10px; }
            .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .full-width { grid-column: span 2; }
            .form-group { margin-bottom: 5px; }
            label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 14px; color: #444; }
            input[type="text"], input[type="number"], input[type="password"], input[type="color"], textarea, select {
                width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; box-sizing: border-box; font-size: 14px; transition: border 0.2s;
            }
            input:focus, textarea:focus, select:focus { border-color: #2196F3; outline: none; }
            textarea { resize: vertical; min-height: 80px; font-family: monospace; }
            .btn-container { margin-top: 30px; display: flex; justify-content: space-between; align-items: center; border-top: 2px solid #f0f0f0; padding-top: 20px; position: sticky; bottom: 0; background: white; z-index: 10; }
            .btn { padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; }
            .btn-save { background-color: #4CAF50; color: white; flex-grow: 1; margin-left: 10px; }
            .btn-save:hover { background-color: #43a047; }
            .btn-reset { background-color: #f44336; color: white; }
            .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #333; color: white; padding: 10px 20px; border-radius: 30px; opacity: 0; transition: opacity 0.3s; z-index: 9999; }
            a { color: #2196F3; text-decoration: none; }
            a:hover { text-decoration: underline; }
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
                    : `<input type="${type}" id="cfg_${key}" value="${config[key]}" ${step ? `step="${step}"` : ""}>`
                }
            </div>
        `;

    const mkSelect = (label, key, options) => {
        let opts = options.map(o => `<option value="${o.val}" ${config[key] === o.val ? 'selected' : ''}>${o.txt}</option>`).join('');
        return `
            <div class="form-group full-width">
                <label>${label}</label>
                <select id="cfg_${key}">${opts}</select>
            </div>
        `;
    };

    container.innerHTML = `
            <div class="alert-box">⚠️ 注意：修改配置后，必须点击页面最下方的【保存配置】按钮，否则改动不会生效！</div>
            
            <h2>🧩 VLM 插件设置</h2>

            <div class="section-title">传输模式</div>
            <div class="form-grid">
                ${mkSelect("图片传输模式", "image_mode", [
                    {val: "base64", txt: "🎨 Canvas 转 Base64 (默认/强力) - 推荐，使用 GM_xhr 绕过 CORS"},
                    {val: "url", txt: "🔗 直接传递 URL - 速度快，但会被严格防盗链拦截"},
                    {val: "proxy", txt: "🌐 代理 URL (Proxy) - 使用 moonchan.xyz 中转"}
                ])}
            </div>

            <div class="section-title">连接设置</div>
            <div class="form-grid">
                <div class="full-width">${mkInput("API Endpoint", "endpoint")}</div>
                <div class="full-width">${mkInput("API Key", "api_key", "password")}</div>
                <label><a href="https://cloud.siliconflow.cn/i/sRO0U8o0" target="_blank">👉 没有 API Key？点我注册硅基流动 (Aff)</a></label>
                <label><a href="https://page.moonchan.xyz/?url=https://pastebin.com/raw/URBkDjwY#markdown-parser" target="_blank">📚 查看API申请教程 (Tutorial)</a></label>
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
                ${mkInput("Frequency Penalty", "frequency_penalty", "number", "0.1")}
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
                <button id="btn-save" class="btn btn-save">💾 保存配置 (Save)</button>
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
  // 模块 2: 结果显示框
  // =========================================================
  const DisplayBox = {
    element: null,
    reasoningElement: null,
    contentElement: null,

    init: function () {
      if (this.element) return;
      this.element = document.createElement("div");
      this.element.id = "vlm-result-box";

      const header = document.createElement("div");
      header.style.cssText =
        "display: flex; justify-content: space-between; align-items: left; padding: 10px; background: rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); cursor: move; touch-action: none; user-select: none;";
      header.innerHTML =
        '<span style="font-size:12px; font-weight:bold;">🤖 VLM Response</span>';

      const closeBtn = document.createElement("span");
      closeBtn.textContent = "✖";
      closeBtn.style.cssText = "cursor: pointer; font-size: 16px; padding: 0 10px;";
      
      const closeAction = (e) => { e.stopPropagation(); this.hide(); };
      closeBtn.addEventListener("click", closeAction);
      closeBtn.addEventListener("touchend", closeAction);
      
      header.appendChild(closeBtn);
      this.element.appendChild(header);

      const scrollContainer = document.createElement("div");
      scrollContainer.style.cssText = "padding: 10px; overflow-y: auto; height: calc(100% - 40px); -webkit-overflow-scrolling: touch; display: flex; flex-direction: column; gap: 10px;";

      this.reasoningElement = document.createElement("div");
      this.reasoningElement.className = "vlm-reasoning";
      this.reasoningElement.style.display = "none";
      scrollContainer.appendChild(this.reasoningElement);

      this.contentElement = document.createElement("div");
      this.contentElement.className = "vlm-markdown-content";
      scrollContainer.appendChild(this.contentElement);

      this.element.appendChild(scrollContainer);
      document.body.appendChild(this.element);

      enableDrag(this.element, header, null);
    },

    applyConfig: function (config) {
      if (!this.element) this.init();

      this.element.style.position = "fixed";
      this.element.style.zIndex = "2147483647";
      this.element.style.width = config.box_width + "px";
      this.element.style.maxWidth = "95vw"; 
      this.element.style.height = config.box_height + "px";
      this.element.style.maxHeight = "90vh"; 
      
      this.element.style.backgroundColor = config.box_bg_color;
      this.element.style.color = config.box_text_color;
      this.element.style.fontSize = config.box_font_size + "px";
      this.element.style.opacity = config.box_opacity;
      this.element.style.borderRadius = "8px";
      this.element.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
      this.element.style.display = "none";
      this.element.style.backdropFilter = "blur(5px)";
      this.element.style.textAlign = "left";

      const css = `
                .vlm-markdown-content p { margin: 0 0 10px 0; line-height: 1.5; }
                .vlm-markdown-content strong { color: #4fc3f7; }
                .vlm-markdown-content code { background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 3px; font-family: monospace; }
                .vlm-markdown-content pre { background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; overflow-x: auto; }
                .vlm-markdown-content ul, .vlm-markdown-content ol { padding-left: 20px; }
                .vlm-markdown-content hr { border: 0; border-top: 1px solid rgba(255,255,255,0.2); margin: 10px 0; }
                .vlm-reasoning { background: rgba(255, 255, 255, 0.05); border-left: 3px solid #FF9800; padding: 8px; margin-bottom: 10px; border-radius: 4px; font-size: 0.9em; color: #aaa; }
                .vlm-reasoning-title { font-weight: bold; margin-bottom: 5px; color: #FF9800; display: block; font-size: 0.85em; text-transform: uppercase; }
                @media (max-width: 600px) { .vlm-markdown-content { font-size: 13px; } }
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
      
      const boxW = Math.min(config.box_width, window.innerWidth * 0.95);
      const boxH = Math.min(config.box_height, window.innerHeight * 0.9);
      
      let left = fabRect.left - boxW - 20;
      let top = fabRect.top - boxH + fabRect.height;

      if (left < 10) {
          left = fabRect.right + 20;
          if (left + boxW > window.innerWidth) {
              left = (window.innerWidth - boxW) / 2;
          }
      }
      if (top < 10) top = 10;
      if (top + boxH > window.innerHeight) top = window.innerHeight - boxH - 10;

      this.element.style.left = left + "px";
      this.element.style.top = top + "px";
      this.element.style.display = "block";

      this.reasoningElement.style.display = "none";
      this.reasoningElement.innerHTML = "";
      this.contentElement.innerHTML = '<div style="opacity:0.6;">⏳ Waiting for stream...</div>';
      this.element.querySelector('div[style*="overflow-y"]').scrollTop = 0;
    },

    updateReasoning: function(text) {
        if (!this.reasoningElement || !text) return;
        this.reasoningElement.style.display = "block";
        this.reasoningElement.innerHTML = `<span class="vlm-reasoning-title">🧠 Thinking Process</span><div style="white-space: pre-wrap;">${text}</div>`;
        const container = this.element.querySelector('div[style*="overflow-y"]');
        if (container) container.scrollTop = container.scrollHeight;
    },

    updateContent: function (markdownText) {
        if (!this.contentElement) return;
        const html = marked.parse(markdownText);
        this.contentElement.innerHTML = html;
        const container = this.element.querySelector('div[style*="overflow-y"]');
        if (container) container.scrollTop = container.scrollHeight;
    },

    hide: function () {
      if (this.element) this.element.style.display = "none";
    },
  };

  // =========================================================
  // 模块 3: 图片处理
  // =========================================================

  const ImageProcessor = {
    getPayload: function(imgUrl, mode) {
        console.log(`[VLM] Processing image in mode: ${mode}`);
        if (mode === 'url') {
            return Promise.resolve(imgUrl);
        } else if (mode === 'proxy') {
            return Promise.resolve(this.generateProxyUrl(imgUrl));
        } else {
            // base64 mode - use Strong Fetch (GM_xmlhttpRequest)
            return this.convertToBase64_Strict(imgUrl);
        }
    },

    generateProxyUrl: function(src) {
        try {
            const urlObj = new URL(src);
            const originalHost = urlObj.host;
            urlObj.host = "proxy.moonchan.xyz";
            urlObj.searchParams.append("proxy_host", originalHost);
            return urlObj.toString();
        } catch (e) {
            console.warn("[VLM] URL parsing failed, fallback to original.", e);
            return src;
        }
    },

    convertToBase64_Strict: function (srcUrl) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url: srcUrl,
          responseType: "blob",
          headers: {
             "Referer": window.location.href // 关键：带上 Referer 绕过防盗链
          },
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
              img.onerror = () => reject(new Error("Image load failed inside Canvas conversion"));
              img.src = URL.createObjectURL(blob);
            } else {
              reject(new Error("GM_xmlhttpRequest Download failed: " + response.status));
            }
          },
          onerror: (err) => reject(new Error("GM_xmlhttpRequest Network Error")),
        });
      });
    },
  };

  // =========================================================
  // 模块 4: 网络请求
  // =========================================================
  async function sendStreamRequest(config, imagePayload) {
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
          content: [
              { 
                  type: "image_url", 
                  image_url: { 
                      url: imagePayload 
                  } 
              }
          ],
        },
      ],
    };

    let currentReasoning = "";
    let currentContent = "";
    let buffer = "";

    try {
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

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith("data: ")) {
            const jsonStr = trimmed.slice(6);
            if (jsonStr === "[DONE]") continue;
            try {
              const json = JSON.parse(jsonStr);
              if (json.choices && json.choices.length > 0) {
                const delta = json.choices[0].delta;
                
                const reasoningChunk = delta.reasoning_content || delta.reasoning;
                if (reasoningChunk) {
                    currentReasoning += reasoningChunk;
                    DisplayBox.updateReasoning(currentReasoning);
                }

                if (delta.content) {
                  currentContent += delta.content;
                  DisplayBox.updateContent(currentContent);
                }
              }
            } catch (e) { console.warn(e); }
          }
        }
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      DisplayBox.updateContent(`**Network Error:** ${err.message}\n\n*Check API Key / Endpoint / CORS settings.*`);
    } finally {
      Picker.updateBtnState("idle", "👁️");
      Picker.isProcessing = false;
    }
  }

  // =========================================================
  // 模块 5: 交互逻辑
  // =========================================================

  function injectStyles() {
    if (document.getElementById("vlm-vanilla-styles")) return;
    const css = `
            #vlm-fab { position: fixed; width: 50px; height: 50px; background: #333; color: white; border-radius: 50%; z-index: 2147483646; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 24px; border: 2px solid rgba(255,255,255,0.2); transition: transform 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.3); touch-action: none; user-select: none; }
            #vlm-fab:active { transform: scale(0.95); }
            #vlm-fab.active { background-color: #F44336; border-color: white; }
            #vlm-fab.processing { background-color: #FF9800; cursor: wait; }
            .vlm-picking-mode { cursor: crosshair !important; }
            .vlm-target-highlight { outline: 5px solid #F44336 !important; outline-offset: -2px; z-index: 2147483645; }
        `;
    const style = document.createElement("style");
    style.id = "vlm-vanilla-styles";
    style.textContent = css;
    
    if (document.head) {
        document.head.appendChild(style);
    } else {
        document.documentElement.appendChild(style);
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

        const storedConfig = GM_getValue("vlm_full_config", {});
        const config = { ...DEFAULT_CONFIG, ...storedConfig };

        const src = e.target.src;
        Picker.isProcessing = true;
        Picker.updateBtnState("processing", "⏳");

        const fab = document.getElementById("vlm-fab");
        const fabRect = fab.getBoundingClientRect();
        DisplayBox.show(fabRect, config);

        // 根据配置选择模式
        ImageProcessor.getPayload(src, config.image_mode)
          .then((payload) => {
            sendStreamRequest(config, payload);
          })
          .catch((err) => {
            DisplayBox.updateContent(`**Error Processing Image:** ${err.message}`);
            Picker.isProcessing = false;
            Picker.updateBtnState("idle", "👁️");
          });

        e.target.classList.remove("vlm-target-highlight");
        Picker.disable();
      } else {
        Picker.disable();
      }
    },
  };

  function createFloatingButton() {
    const fab = document.createElement("div");
    fab.id = "vlm-fab";
    fab.textContent = "👁️";
    fab.title = "点击开始取景 (支持拖拽)";
    fab.style.left = window.innerWidth - 70 + "px";
    fab.style.top = window.innerHeight - 150 + "px";
    document.body.appendChild(fab);

    enableDrag(fab, fab, (e) => {
        if (!Picker.isProcessing)
          Picker.isActive ? Picker.disable() : Picker.enable();
    });
  }

  function init() {
    // 注册菜单命令，方便随时打开设置
    GM_registerMenuCommand("⚙️ 打开 VLM 设置", () => {
        GM_openInTab(`https://${CONFIG_DOMAIN}/`, { active: true });
    });

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
