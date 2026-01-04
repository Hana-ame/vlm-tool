(function () {
    'use strict';

    // =========================================================================
    // 1. 基础 URL 替换功能 (对应 Go 中的 bytes.ReplaceAll)
    // =========================================================================
    function fixBaseUrls() {
        // 替换所有 A 标签的 href
        const links = document.getElementsByTagName('a');
        for (let i = 0; i < links.length; i++) {
            let href = links[i].href;
            if (href.includes('https://exhentai.org')) {
                links[i].href = href.replace('https://exhentai.org', '');
            }
        }

        // 替换所有 IMG 标签的 src
        const imgs = document.getElementsByTagName('img');
        for (let i = 0; i < imgs.length; i++) {
            let src = imgs[i].src;
            if (src.includes('https://s.exhentai.org')) {
                imgs[i].src = src.replace('https://s.exhentai.org', 'https://ehgt.org');
            }
        }
    }

    // =========================================================================
    // 2. CSS 样式注入 (合并了悬浮窗等所需的 CSS)
    // =========================================================================
    function injectStyles() {
        const style = document.createElement('style');
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
                background-color: rgba(255,255,255,0.5);
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
            #moonchan-close-button:after {
                content: '';
                position: absolute;
                top: -10px;
                right: -10px;
                bottom: -10px;
                left: -10px;
            }
            #moonchan-close-button:active {
                transform: scale(0.9);
            }
            #moonchan-close-button[disabled] {
                opacity: 0.6;
                pointer-events: none;
            }
            
            /* 通用按钮容器样式 */
            .custom-btn-container {
                height: 60px;
                width: 100px;
                text-align: center;
                position: fixed;
                right: 20px; 
                top: 20px;
                z-index: 99;
                display: table-cell;
                vertical-align: middle;
            }
            .custom-btn {
                width: 100%;    
                height: 100%;
                font-size: x-large;
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
        const gl3tElements = document.getElementsByClassName('gl3t');
        if (gl3tElements.length === 0) return;

        // 创建按钮容器
        const container = document.createElement('div');
        container.className = 'custom-btn-container';
        // 如果页面也有瀑布流按钮，可能需要调整位置，这里保持原逻辑覆盖或共存
        // 原逻辑是分别注入的，这里我们根据页面内容判断显示哪个

        const btn = document.createElement('button');
        btn.id = 'reload-cover';
        btn.className = 'custom-btn';
        btn.style.display = 'block'; // 原逻辑是 none 然后 js 变 block，这里直接判断后显示
        btn.innerText = '重新加载封面';

        container.appendChild(btn);
        document.body.appendChild(container);

        // 绑定点击事件
        btn.addEventListener("click", async function () {
            window.stop();
            replace = function(elements){
                for (let i = 0; i < elements.length; i++) {
                    const links = elements[i].getElementsByTagName('a');
                    for (let j = 0; j < links.length; j++) {
                        const href = links[j].href;
                        console.log(links[j]);
                        const imgs = links[j].getElementsByTagName('img');
                        for (let k = 0; k < imgs.length; k++) {
                            // 修正：确保拼接参数正确
                            const separator = href.includes('?') ? '&' : '?';
                            imgs[k].src = href + separator + 'redirect_to=cover';
                        }
                    }
                }
            }
            const gl3tElements = document.getElementsByClassName('gl3t');
            replace(gl3tElements);
            const gl1eElements =  document.getElementsByClassName('gl1e');
            replace(gl1eElements);
        }, false);
    }

    // =========================================================================
    // 4. 瀑布流 (Waterfall) 与 复制外链功能
    // =========================================================================
    function initWaterfall() {
        if (localStorage.getItem("waterfall") === "false") {
            return;
        }
        // 简单判断：如果页面有 #i1 (通常是图片页) 或者特定的阅读器结构，才加载瀑布流按钮
        // 原代码直接替换 body，比较粗暴。这里假设如果不含 gl3t (列表页特征)，可能是详情/阅读页
        // 或者我们可以检查是否存在 'gdt' 或 'i1' 等特征 ID
        // 为避免冲突，这里仅当页面存在 id="i1" 或 id="img" 时视为阅读页
        if (!document.getElementById('i1') && !document.getElementById('img')) return;

        // 右上角按钮容器
        const rightContainer = document.createElement('div');
        rightContainer.className = 'custom-btn-container';
        
        const btn1 = document.createElement('button');
        btn1.id = 'waterfall';
        btn1.className = 'custom-btn';
        btn1.innerText = '下拉式1';
        btn1.style.height = '50%'; // 两个按钮各占一半
        
        const btn2 = document.createElement('button');
        btn2.id = 'waterfall2';
        btn2.className = 'custom-btn';
        btn2.innerText = '下拉式2';
        btn2.style.height = '50%';

        rightContainer.appendChild(btn1);
        rightContainer.appendChild(btn2);
        document.body.appendChild(rightContainer);

        // 左上角按钮容器 (复制外链)
        const leftContainer = document.createElement('div');
        leftContainer.style.cssText = `
            height: 60px;
            width: 100px;
            text-align: center;
            position: fixed;
            left: 20px; 
            top: 20px;
            z-index: 99;
        `;
        const originBtn = document.createElement('button');
        originBtn.id = 'originBtn';
        originBtn.className = 'custom-btn';
        originBtn.innerText = '复制图片外链';
        leftContainer.appendChild(originBtn);
        document.body.appendChild(leftContainer);

        // --- 事件逻辑 ---

        // 下拉式1
        btn1.addEventListener("click", async function () {
            console.log('Starting Waterfall 1');
            // 移除按钮
            if(document.getElementById("originBtn")) document.getElementById("originBtn").remove();
            if(document.getElementById("waterfall")) document.getElementById("waterfall").remove();
            if(document.getElementById("waterfall2")) document.getElementById("waterfall2").remove();

            const pn = document.createElement('div');
            let lp = location.href;
            let ln = location.href;
            const element = document.getElementById('i1');
            if(element) element.appendChild(pn);

            let nextLink = document.getElementById('next');
            let hn = nextLink ? nextLink.href : ln;

            while (hn !== ln && hn) {
                let doc;
                let retries = 0;
                while (!doc && retries < 3) {
                    try {
                        const data = await fetch(hn).then(resp => resp.text());
                        console.log("Fetched next page");
                        const parser = new DOMParser();
                        doc = parser.parseFromString(data, "text/html");
                    } catch (e) {
                        console.error(e);
                        retries++;
                    }
                }
                
                if(!doc) break;

                const imgElem = document.createElement('img');
                const remoteImg = doc.getElementById('img');
                if (remoteImg) {
                    imgElem.src = remoteImg.src;
                    imgElem.style.maxWidth = '100%'; // 优化显示
                    imgElem.style.display = 'block';
                    imgElem.style.margin = '0 auto';
                    pn.appendChild(imgElem);
                    
                    ln = hn;
                    const nextEl = doc.getElementById('next');
                    hn = nextEl ? nextEl.href : ln;
                } else {
                    break;
                }
            }
            const p = document.createElement('p');
            p.innerText = "End of gallery or error.";
            pn.appendChild(p);
        }, false);

        // 下拉式2
        btn2.addEventListener("click", async function () {
            const currentPath = window.location.pathname;
            const newUrl = '/?host=page.moonchan.xyz#' + currentPath;
            window.location.href = newUrl;
        }, false);

        // 复制外链
        originBtn.addEventListener("click", function () {
            const currentUrl = window.location.href;
            const hasQuery = currentUrl.includes('?');
            const newUrl = currentUrl + (hasQuery ? '&' : '?') + 'redirect_to=image';

            if (navigator.clipboard) {
                navigator.clipboard.writeText(newUrl)
                    .then(() => alert('已复制到剪贴板！'))
                    .catch(() => fallbackCopy(newUrl));
            } else {
                fallbackCopy(newUrl);
            }

            function fallbackCopy(text) {
                const input = document.createElement('input');
                input.value = text;
                document.body.appendChild(input);
                input.select();
                try {
                    document.execCommand('copy');
                    alert('已复制（兼容模式）');
                } catch (err) {
                    alert('复制失败，请手动复制');
                } finally {
                    document.body.removeChild(input);
                }
            }
        });
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
        if (localStorage.getItem("gscript") !== "false" && location.pathname.startsWith("/g/")) {
            loadScript("https://config.810114.xyz/exhentai/gscript.js");
        }

        // reader
        if (localStorage.getItem("reader") !== "false" && location.pathname.startsWith("/g/")) {
            loadScript("https://config.810114.xyz/exhentai/reader.js");
        }
    }

    // =========================================================================
    // 6. 右下角悬浮窗
    // =========================================================================
    function initFloatingNotice() {
        const mark = '1228';
        if (localStorage.getItem('iframeClosed') === mark) {
            return;
        }

        const div = document.createElement('div');
        div.id = 'moonchan-floating-iframe';
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

        document.getElementById("moonchan-close-button").addEventListener("click", function() {
            div.style.display = 'none';
            localStorage.setItem('iframeClosed', mark);
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
        fixBaseUrls();      // 1. URL 替换
        injectStyles();     // 2. 样式注入
        initReloadCover();  // 3. 封面重载 (列表页)
        initWaterfall();    // 4. 瀑布流 (阅读页)
        initScriptLoader(); // 5. 外部脚本加载
        initFloatingNotice();// 6. 悬浮窗
    }

})();
