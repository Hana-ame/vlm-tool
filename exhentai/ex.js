(function () {
  "use strict";

  // 不让访问s.exhentai.org
  const originalOpen = XMLHttpRequest.prototype.open;
  const BLOCKED_DOMAIN = "s.exhentai.org";

  XMLHttpRequest.prototype.open = function (method, url) {
    // 将 url 转换为字符串（以防传入的是 URL 对象）
    const urlString = String(url);

    // 检查是否包含禁止的域名
    if (urlString.includes(BLOCKED_DOMAIN)) {
      console.error(`不样: ${urlString}`);
      // 抛出异常以阻止请求发送
      throw new Error("Blocked: Request to s.exhentai.org is not allowed.");
    }

    // 如果不是黑名单域名，则正常执行
    return originalOpen.apply(this, arguments);
  };
  
(function() {
    'use strict';

    // 定义要替换的目标：匹配 https://exhentai.org 以及 https://s.exhentai.org
    // 解释：https:\/\/ 匹配协议，(?:s\.)? 匹配可选的 "s." 子域名，exhentai\.org 匹配主域名
    const targetRegex = /https:\/\/(?:s\.)?exhentai\.org/g;

    // 1. 处理 <a> 标签中的 onclick 属性
    const anchors = document.querySelectorAll('a[onclick*="exhentai.org"]');
    anchors.forEach(function(a) {
        let originalOnClick = a.getAttribute('onclick');
        if (originalOnClick) {
            // 执行替换
            let newOnClick = originalOnClick.replace(targetRegex, '');
            // 重新设置属性
            a.setAttribute('onclick', newOnClick);
        }
    });

    // 2. 处理 <div> 标签中的 style 属性 (背景图片 URL)
    const divs = document.querySelectorAll('div[style*="exhentai.org"]');
    divs.forEach(function(div) {
        let originalStyle = div.getAttribute('style');
        if (originalStyle) {
            // 执行替换
            let newStyle = originalStyle.replace(targetRegex, '');
            // 重新设置属性
            div.setAttribute('style', newStyle);
        }
    });

    console.log("替换完成：已移除链接和样式中的绝对域名前缀。");
})();
  
  // =========================================================================
  // 1. 基础 URL 替换功能 (对应 Go 中的 bytes.ReplaceAll)
  // =========================================================================
  function fixBaseUrls() {
    // 替换所有 A 标签的 href
    const links = document.getElementsByTagName("a");
    for (let i = 0; i < links.length; i++) {
      let href = links[i].href;
      if (href.includes("https://exhentai.org")) {
        links[i].href = href.replace("https://exhentai.org", "");
      }
    }

    // 替换所有 IMG 标签的 src
    const imgs = document.getElementsByTagName("img");
    for (let i = 0; i < imgs.length; i++) {
      let src = imgs[i].src;
      if (src.includes("https://s.exhentai.org")) {
        imgs[i].src = src.replace("https://s.exhentai.org", "https://ehgt.org");
      }
    }
  }
  // =========================================================================
  // 2. CSS 样式注入 (已适配移动端)
  // =========================================================================
  function injectStyles() {
    const style = document.createElement("style");
    style.innerHTML = `
            /* 悬浮窗样式 */
            #moonchan-floating-iframe {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 300px;
                height: 200px;
                border: 2px solid #ccc;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
                z-index: 100000;
                overflow: hidden;
                background-color: rgba(255,255,255,0.9);
            }
            #moonchan-close-button {
                position: absolute;
                top: 10px;
                right: 10px;
                background-color: red;
                color: white;
                border: none;
                border-radius: 50%;
                width: 48px;
                height: 48px;
                padding: 6px;
                cursor: pointer;
                font-size: 24px;
                line-height: 48px;
                transition: 0.2s;
            }
            
            /* 按钮容器默认样式 (PC) */
            .custom-btn-container {
                height: 60px;
                width: 100px;
                text-align: center;
                position: fixed;
                z-index: 999; /* 提高层级防止被遮挡 */
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            /* 右侧按钮位置 (默认) */
            .right-container {
                right: 20px; 
                top: 20px;
            }

            /* 左侧按钮位置 (默认) */
            .left-container {
                left: 20px; 
                top: 20px;
            }

            .custom-btn {
                width: 100%;    
                flex: 1;
                font-size: 16px;
                cursor: pointer;
                border: 1px solid #999;
                background: rgba(255, 255, 255, 0.8);
                color: #000;
                font-weight: bold;
            }

            /* === 移动端触屏适配 (屏幕宽度 < 768px) === */
            @media screen and (max-width: 768px) {
                /* 调整悬浮窗位置和大小 */
                #moonchan-floating-iframe {
                    width: 90%;
                    left: 5%;
                    bottom: 10px;
                    right: auto;
                    font-size: 12px;
                }

                /* 移动端按钮容器样式 */
                .custom-btn-container {
                    width: 70px; /* 稍微变窄 */
                    height: auto;
                }

                /* 右侧按钮：移至右下角拇指易触区域 */
                .right-container {
                    top: auto;
                    bottom: 150px; /* 避开底部导航栏或悬浮窗 */
                    right: 10px;
                }

                /* 左侧按钮：移至左下角或折叠，避免遮挡顶部 */
                .left-container {
                    top: auto;
                    bottom: 150px;
                    left: 10px;
                }

                /* 按钮样式优化：增加点击热区，增加透明度防止遮挡 */
                .custom-btn {
                    padding: 10px 0;
                    font-size: 14px;
                    opacity: 0.7; /* 半透明 */
                    border-radius: 8px;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                }
                
                .custom-btn:active {
                    opacity: 1;
                    background: #eee;
                }
            }
        `;
    document.head.appendChild(style);
  }

  // =========================================================================
  // 3. 重新加载封面功能
  // =========================================================================
  function initReloadCover() {
    if (localStorage.getItem("waterfall") === "false") {
      return;
    }
    // 检查是否存在 gl3t 元素
    const gl3tElements = document.getElementsByClassName("gl3t");
    if (gl3tElements.length === 0) return;

    // 创建按钮容器
    const container = document.createElement("div");
    container.className = "custom-btn-container";
    // 如果页面也有瀑布流按钮，可能需要调整位置，这里保持原逻辑覆盖或共存
    // 原逻辑是分别注入的，这里我们根据页面内容判断显示哪个

    const btn = document.createElement("button");
    btn.id = "reload-cover";
    btn.className = "custom-btn";
    btn.style.display = "block"; // 原逻辑是 none 然后 js 变 block，这里直接判断后显示
    btn.innerText = "重新加载封面";

    container.appendChild(btn);
    document.body.appendChild(container);

    // 绑定点击事件
    btn.addEventListener(
      "click",
      async function () {
        window.stop();
        replace = function (elements) {
          for (let i = 0; i < elements.length; i++) {
            const links = elements[i].getElementsByTagName("a");
            for (let j = 0; j < links.length; j++) {
              const href = links[j].href;
              console.log(links[j]);
              const imgs = links[j].getElementsByTagName("img");
              for (let k = 0; k < imgs.length; k++) {
                // 修正：确保拼接参数正确
                const separator = href.includes("?") ? "&" : "?";
                imgs[k].src = href + separator + "redirect_to=cover";
              }
            }
          }
        };
        const gl3tElements = document.getElementsByClassName("gl3t");
        replace(gl3tElements);
        const gl1eElements = document.getElementsByClassName("gl1e");
        replace(gl1eElements);
      },
      false
    );
  }
  // =========================================================================
  // 4. 瀑布流 (Waterfall) 与 复制外链功能 (已适配触屏)
  // =========================================================================
  function initWaterfall() {

    if (!location.pathname.startsWith("/s/")) return;

    (function () {
      "use strict";

      // --- 创建容器 (UI) ---

      // 1. 右侧容器 (包含：重载封面、下拉式1、下拉式2)
      // 为了防止原代码中两个 div 都在 top:20px 重叠，这里使用 Flex 布局垂直排列
      const rightContainer = document.createElement("div");
      rightContainer.style.cssText = `
        width: 100px;
        position: fixed;
        right: 20px;
        top: 20px;
        z-index: 99;
        display: flex;
        flex-direction: column;
        gap: 10px; /* 按钮之间的间距 */
        pointer-events: none; /* 让容器不阻挡点击，子元素恢复点击 */
    `;

      // 2. 左侧容器 (包含：复制图片外链)
      const leftContainer = document.createElement("div");
      leftContainer.style.cssText = `
        height: 60px;
        width: 100px;
        text-align: center;
        position: fixed;
        left: 20px;
        top: 20px;
        z-index: 99;
    `;

      // --- 创建按钮 ---

      // 通用按钮样式工厂
      function createBtnStyle(fontSize = "x-large", display = "block") {
        return `
            width: 100%;
            height: 60px;
            font-size: ${fontSize};
            display: ${display};
            pointer-events: auto;
            cursor: pointer;
            margin-bottom: 5px;
        `;
      }

      // 按钮 1: 重新加载封面 (默认隐藏)
      const btnReload = document.createElement("button");
      btnReload.id = "reload-cover";
      btnReload.innerText = "重新加载封面";
      btnReload.style.cssText = createBtnStyle("x-large", "none"); // display: none

      // 按钮 2: 下拉式1
      const btnWaterfall1 = document.createElement("button");
      btnWaterfall1.id = "waterfall";
      btnWaterfall1.innerText = "下拉式1";
      btnWaterfall1.style.cssText = createBtnStyle();

      // 按钮 3: 下拉式2
      const btnWaterfall2 = document.createElement("button");
      btnWaterfall2.id = "waterfall2";
      btnWaterfall2.innerText = "下拉式2";
      btnWaterfall2.style.cssText = createBtnStyle();

      // 按钮 4: 复制图片外链 (左侧)
      const btnOrigin = document.createElement("button");
      btnOrigin.id = "originBtn";
      btnOrigin.innerText = "复制图片外链";
      btnOrigin.style.cssText = createBtnStyle();

      // --- 组装 DOM ---

      rightContainer.appendChild(btnReload);
      rightContainer.appendChild(btnWaterfall1);
      rightContainer.appendChild(btnWaterfall2);
      leftContainer.appendChild(btnOrigin);

      document.body.appendChild(rightContainer);
      document.body.appendChild(leftContainer);

      // --- 逻辑功能实现 ---

      // 逻辑 1: 下拉式1 (瀑布流加载)
      async function execWaterfall() {
        console.log("!");
        // 移除按钮 (保持原逻辑)
        if (document.getElementById("originBtn"))
          document.getElementById("originBtn").remove();
        if (document.getElementById("waterfall"))
          document.getElementById("waterfall").remove();
        if (document.getElementById("waterfall2"))
          document.getElementById("waterfall2").remove();

        let pn = document.createElement("div");
        let lp = location.href;
        let ln = location.href;

        // 注意：原代码假设页面有名为 i1 的元素作为容器
        const element = document.getElementById("i1");
        if (!element) {
          console.error("未找到 id='i1' 的元素，无法加载瀑布流");
          return;
        }
        element.appendChild(pn);

        // 获取下一页链接
        let nextEl = document.getElementById("next");
        if (!nextEl) return;
        let hn = nextEl.href;

        while (hn != ln) {
          let doc;
          while (!doc) {
            try {
              doc = await fetch(hn)
                .then((resp) => resp.text())
                .then((data) => {
                  // console.log(data); // 原代码有log，略微有些刷屏，可注释
                  let parser = new DOMParser();
                  return parser.parseFromString(data, "text/html");
                });
            } catch (e) {
              console.error("Fetch error:", e);
              break;
            }
          }
          // console.log(doc);

          let img = document.createElement("img");
          let imgElement = doc.getElementById("img"); // 获取新页面里的 img 元素

          if (imgElement) {
            img.src = imgElement.src;
            // 简单的样式优化，防止图片过大溢出
            img.style.maxWidth = "100%";
            img.style.display = "block";
            img.style.margin = "0 auto";

            pn.appendChild(img);
            ln = hn; // 更新当前页
            let nextLink = doc.getElementById("next");
            if (nextLink) {
              hn = nextLink.href; // 更新下一页
              hn = hn.replace("https://exhentai.org", "");
            } else {
              break;
            }
          } else {
            break;
          }
        }
        let p = document.createElement("p");
        p.innerHTML = hn;
        pn.appendChild(p);
      }

      // 逻辑 2: 下拉式2 (跳转 URL)
      async function execWaterfall2() {
        // 获取当前 URL 的路径
        const currentPath = window.location.pathname;
        // 定义新的连接
        const newUrl = "/?host=page.moonchan.xyz#" + currentPath;
        // 跳转到新的连接
        window.location.href = newUrl;
      }

      // 逻辑 3: 复制图片外链
      function copyOriginLink() {
        const currentUrl = window.location.href;
        // 智能添加 ? 或 &
        const hasQuery = currentUrl.includes("?");
        const newUrl =
          currentUrl + (hasQuery ? "&" : "?") + "redirect_to=image";

        if (navigator.clipboard) {
          navigator.clipboard
            .writeText(newUrl)
            .then(() => alert("已复制到剪贴板！"))
            .catch(() => fallbackCopy(newUrl));
        } else {
          fallbackCopy(newUrl);
        }

        function fallbackCopy(text) {
          const input = document.createElement("input");
          input.value = text;
          document.body.appendChild(input);
          input.select();
          try {
            document.execCommand("copy");
            alert("已复制（兼容模式）");
          } catch (err) {
            alert("复制失败，请手动复制");
          } finally {
            document.body.removeChild(input);
          }
        }
      }

      // --- 绑定事件监听 ---

      btnWaterfall1.addEventListener("click", execWaterfall, false);
      btnWaterfall2.addEventListener("click", execWaterfall2, false);
      btnOrigin.addEventListener("click", copyOriginLink, false);

      // reload-cover 原代码中默认隐藏且没有绑定具体事件逻辑，
      // 如果需要显示它，可以在控制台输入 document.getElementById('reload-cover').style.display = 'block'
    })();
  }

  // =========================================================================
  // 5. 注入脚本 (Client Loader / Inline Chat)
  // =========================================================================
  function initScriptLoader() {
    const loadScript = (src) => {
      const script = document.createElement("script");
      script.src = src;
      document.body.appendChild(script);
    };

    // inline-chat
    if (localStorage.getItem("chat") !== "false") {
      loadScript("https://inline-chat.moonchan.xyz/loader.js");
      console.log("GM Polyfill loaded via localStorage.");
    }

    // ehsyringe
    if (localStorage.getItem("ehsyringe") !== "false") {
      loadScript("https://config.810114.xyz/exhentai/gm-polyfill.js");
      loadScript("https://config.810114.xyz/exhentai/EhSyringe.user.js");
    }

    // gscript
    if (
      localStorage.getItem("gscript") !== "false" &&
      location.pathname.startsWith("/g/")
    ) {
      loadScript("https://config.810114.xyz/exhentai/gscript.js");
    }

    // reader
    if (
      localStorage.getItem("reader") !== "false" &&
      location.pathname.startsWith("/g/")
    ) {
      loadScript("https://config.810114.xyz/exhentai/reader.js");
    }
  }

  // =========================================================================
  // 6. 右下角悬浮窗
  // =========================================================================
  function initFloatingNotice() {
    const mark = "1228";
    if (localStorage.getItem("iframeClosed") === mark) {
      return;
    }

    const div = document.createElement("div");
    div.id = "moonchan-floating-iframe";
    div.innerHTML = `
            <button id="moonchan-close-button">×</button>
            <div style="padding: 10px; font-size: 14px;">
                <p>moonchan.xyz有DNS污染迹象，请注意迁移到以下节点</p>
                <p style="color: black;">New:<a href="https://ex.810114.xyz/" target="_blank">https://ex.810114.xyz/</a>（无污染永续）</p>			
                <p style="color: black;">新年快乐，更新一下程序，所以1月1日可能麻烦大家挡一下小白鼠</p>			
                <p><a style="color: black;" href="/uconfig.php">点击上方Settings（点这句话也可以）选择希望开启的脚本</a></p>
                <p><a style="color: black;" href="/uconfig.php">有的脚本没做是因为有技术限制，有想要的tamper monkey脚本可以发一下做fork，来https://810114.xyz/ (去掉ex就行)</a></p>
            </div>
        `;
    document.body.appendChild(div);

    document
      .getElementById("moonchan-close-button")
      .addEventListener("click", function () {
        div.style.display = "none";
        localStorage.setItem("iframeClosed", mark);
      });
  }

  // =========================================================================
  // 主入口
  // =========================================================================
  // 确保 DOM 加载完成后执行
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }

  function main() {
    console.log(1517);
    fixBaseUrls(); // 1. URL 替换
    injectStyles(); // 2. 样式注入
    initReloadCover(); // 3. 封面重载 (列表页)
    initWaterfall(); // 4. 瀑布流 (阅读页)
    initScriptLoader(); // 5. 外部脚本加载
    initFloatingNotice(); // 6. 悬浮窗
  }
})();
