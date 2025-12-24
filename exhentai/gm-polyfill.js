// polyfill.js
(function () {
  // --- 定义 GM_info ---
  window.GM_info = {
    script: {
      name: "Polyfill Script",
      version: "1.0.0",
      namespace: "https://example.com/",
      description: "Simulated Greasemonkey Environment",
      author: "Developer",
      includes: [],
      excludes: [],
      matches: ["*://*/*"],
      resources: [],
      unwrap: false,
    },
    scriptHandler: "Tampermonkey", // 模拟脚本管理器名称
    version: "4.18.0", // 模拟脚本管理器的版本
    injectInto: "page",
    platform: {
      browserName: "Chrome",
      browserVersion: "120.0.0",
      os: "Windows",
    },
  };

  const STORAGE_PREFIX = "GM_STORAGE_";

  // --- 1. 内部存储辅助 ---
  const listeners = new Map();
  function triggerListeners(key, newValue, oldValue, remote) {
    const keyListeners = listeners.get(key);
    if (keyListeners) {
      const parsedNew = newValue ? JSON.parse(newValue) : undefined;
      const parsedOld = oldValue ? JSON.parse(oldValue) : undefined;
      keyListeners.forEach((item) =>
        item.callback(key, parsedOld, parsedNew, remote)
      );
    }
  }

  // --- 2. 同步 API (GM_*) ---

  window.GM_getValue = function (key, defaultValue) {
    const value = localStorage.getItem(STORAGE_PREFIX + key);
    try {
      return value !== null ? JSON.parse(value) : defaultValue;
    } catch (e) {
      return value || defaultValue;
    }
  };

  window.GM_setValue = function (key, value) {
    const fullKey = STORAGE_PREFIX + key;
    const oldValue = localStorage.getItem(fullKey);
    const newValue = JSON.stringify(value);
    localStorage.setItem(fullKey, newValue);
    triggerListeners(key, newValue, oldValue, false);
  };

  window.GM_deleteValue = function (key) {
    const fullKey = STORAGE_PREFIX + key;
    const oldValue = localStorage.getItem(fullKey);
    localStorage.removeItem(fullKey);
    triggerListeners(key, null, oldValue, false);
  };

  window.GM_listValues = function () {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .map((k) => k.replace(STORAGE_PREFIX, ""));
  };

  window.GM_addValueChangeListener = function (key, callback) {
    if (!listeners.has(key)) listeners.set(key, []);
    const id = Math.random().toString(36).substr(2, 9);
    listeners.get(key).push({ id, callback });

    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_PREFIX + key) {
        callback(key, JSON.parse(e.oldValue), JSON.parse(e.newValue), true);
      }
    });
    return id;
  };

  window.GM_removeValueChangeListener = function (id) {
    listeners.forEach((list) => {
      const idx = list.findIndex((item) => item.id === id);
      if (idx !== -1) list.splice(idx, 1);
    });
  };

  window.GM_addStyle = function (css) {
    const style = document.createElement("style");
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
    return style;
  };

  window.GM_setClipboard = function (data, info) {
    navigator.clipboard
      .writeText(data)
      .then(() => {
        console.log("Clipboard set");
      })
      .catch((err) => {
        console.error("Clipboard error", err);
      });
  };

  window.GM_openInTab = function (url, options) {
    return window.open(url, "_blank");
  };

  window.GM_notification = function (details, ondone) {
    if (!("Notification" in window)) {
      alert(details.text || details);
      return;
    }
    const show = () => {
      const n = new Notification(details.title || "Notification", {
        body: details.text,
        icon: details.image,
      });
      if (details.timeout) setTimeout(() => n.close(), details.timeout);
      n.onclick = details.onclick || (() => window.focus());
      n.onclose = ondone;
    };
    if (Notification.permission === "granted") show();
    else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") show();
      });
    }
  };

  window.GM_xmlhttpRequest = function (details) {
    const xhr = new XMLHttpRequest();
    xhr.open(details.method || "GET", details.url, true);
    if (details.headers) {
      for (const [k, v] of Object.entries(details.headers))
        xhr.setRequestHeader(k, v);
    }
    xhr.onload = () => {
      const resp = {
        status: xhr.status,
        statusText: xhr.statusText,
        readyState: xhr.readyState,
        responseText: xhr.responseText,
        responseHeaders: xhr.getAllResponseHeaders(),
        response: xhr.response,
      };
      if (details.onload) details.onload(resp);
    };
    xhr.onerror = (e) => details.onerror && details.onerror(e);
    xhr.send(details.data || null);
    return { abort: () => xhr.abort() };
  };

  // --- 3. 菜单命令模拟 ---
  const menuCommands = [];
  window.GM_registerMenuCommand = function (name, fn) {
    const id = Math.random().toString(36).substr(2, 9);
    menuCommands.push({ id, name, fn });
    updateMenuUI();
    return id;
  };
  window.GM_unregisterMenuCommand = function (id) {
    const idx = menuCommands.findIndex((m) => m.id === id);
    if (idx !== -1) {
      menuCommands.splice(idx, 1);
      updateMenuUI();
    }
  };

  function updateMenuUI() {
    let box = document.getElementById("gm-menu-polyfill");
    if (!box && menuCommands.length > 0) {
      box = document.createElement("div");
      box.id = "gm-menu-polyfill";
      box.setAttribute(
        "style",
        "position:fixed;top:10px;right:10px;z-index:999999;background:#fff;border:2px solid #000;padding:5px;font-family:sans-serif;font-size:12px;box-shadow:4px 4px 0 #000"
      );
      document.body.appendChild(box);
    }
    if (box) {
      if (menuCommands.length === 0) {
        box.remove();
        return;
      }
      box.innerHTML =
        '<div style="font-weight:bold;border-bottom:1px solid #000;margin-bottom:5px">GM Menu</div>';
      menuCommands.forEach((cmd) => {
        const b = document.createElement("button");
        b.textContent = cmd.name;
        b.style =
          "display:block;width:100%;background:#eee;border:1px solid #ccc;margin-top:2px;cursor:pointer;";
        b.onclick = cmd.fn;
        box.appendChild(b);
      });
    }
  }

  // --- 4. GM_info ---
  window.GM_info = {
    script: {
      name: "Polyfill Script",
      version: "1.0.0",
      description: "Simulated Environment",
      namespace: "polyfill",
    },
    scriptHandler: "Polyfill",
    version: "1.0.0",
  };

  // --- 5. 异步 API (GM.*) 映射 ---
  // 按照 Greasemonkey 4 规范，GM 对象的函数返回 Promise
  window.GM = {
    getValue: (k, d) => Promise.resolve(window.GM_getValue(k, d)),
    setValue: (k, v) => Promise.resolve(window.GM_setValue(k, v)),
    deleteValue: (k) => Promise.resolve(window.GM_deleteValue(k)),
    listValues: () => Promise.resolve(window.GM_listValues()),

    addStyle: (css) => Promise.resolve(window.GM_addStyle(css)),
    setClipboard: (d, i) => Promise.resolve(window.GM_setClipboard(d, i)),
    openInTab: (u, o) => Promise.resolve(window.GM_openInTab(u, o)),
    notification: (d, c) => Promise.resolve(window.GM_notification(d, c)),

    // 注意：Greasemonkey 4 中对应的名称是大写的 H
    xmlHttpRequest: (d) => window.GM_xmlhttpRequest(d),

    registerMenuCommand: (n, f) =>
      Promise.resolve(window.GM_registerMenuCommand(n, f)),
    unregisterMenuCommand: (id) =>
      Promise.resolve(window.GM_unregisterMenuCommand(id)),

    addValueChangeListener: (k, c) => window.GM_addValueChangeListener(k, c),
    removeValueChangeListener: (id) => window.GM_removeValueChangeListener(id),

    info: window.GM_info,
  };

  window.unsafeWindow = window;

  // 1. 配置常量
  const STORAGE_KEY = "custom_loader_scripts";
  const CURRENT_VERSION = "1.0.1"; // 👈 每次修改列表后，增加这个版本号

  // 2. 脚本列表数据
  const FIXED_SCRIPTS = [
    {
      name: "聊天室",
      describe: "页面右下角的蓝色社交气泡",
      url: "https://inline-chat.moonchan.xyz/loader.js",
      defaultEnabled: true,
    },
    {
      name: "EhSyringe (汉化)",
      describe: "E站注射器：将全站 UI 及 37000+ 标签翻译为中文。",
      url: "https://config.810114.xyz/exhentai/EhSyringe.user.js",
      defaultEnabled: false,
    },
  ];

  /**
   * 初始化/更新存储控制器
   */
  function initStorage() {
    const rawData = localStorage.getItem(STORAGE_KEY);
    let needUpdate = false;

    if (!rawData) {
      // 场景 A: 首次运行，完全没有数据
      console.log("📦 首次运行，初始化数据...");
      needUpdate = true;
    } else {
      try {
        const parsedData = JSON.parse(rawData);
        // 场景 B: 检查版本号。如果本地版本与当前脚本版本不一致，则覆盖
        if (parsedData.version !== CURRENT_VERSION) {
          console.log(
            `🆙 版本更新: ${
              parsedData.version || "unknown"
            } -> ${CURRENT_VERSION}`
          );
          needUpdate = true;
        }
      } catch (e) {
        // 场景 C: 数据损坏，强制重置
        console.error("⚠️ 存储数据格式损坏，正在重置...");
        needUpdate = true;
      }
    }

    if (needUpdate) {
      const payload = {
        version: CURRENT_VERSION,
        scripts: FIXED_SCRIPTS,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      console.log("✅ 数据同步成功");
    } else {
      console.log("ℹ️ 数据已是最新版本，无需操作");
    }
  }

  // 执行
  initStorage();
})();
