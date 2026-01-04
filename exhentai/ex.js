(function () {
    'use strict';

    // 不让访问s.exhentai.org
    const originalOpen = XMLHttpRequest.prototype.open;
    const BLOCKED_DOMAIN = 's.exhentai.org';
    
    XMLHttpRequest.prototype.open = function(method, url) {
        // 将 url 转换为字符串（以防传入的是 URL 对象）
        const urlString = String(url);
    
        // 检查是否包含禁止的域名
        if (urlString.includes(BLOCKED_DOMAIN)) {
            console.error(`不样: ${urlString}`);
            // 抛出异常以阻止请求发送
            throw new Error('Blocked: Request to s.exhentai.org is not allowed.');
        }
        
        // 如果不是黑名单域名，则正常执行
        return originalOpen.apply(this, arguments);
    };
    
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
    // 2. CSS 样式注入 (已适配移动端)
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
    // 4. 瀑布流 (Waterfall) 与 复制外链功能 (已适配触屏)
    // =========================================================================
    function initWaterfall() {
        if (localStorage.getItem("waterfall") === "false") {
            return;
        }
        
        // 判断是否为阅读页 (含 i1 或 img)
        if (!document.getElementById('i1') && !document.getElementById('img')) return;

        // 右侧按钮容器 (下拉式)
        const rightContainer = document.createElement('div');
        rightContainer.className = 'custom-btn-container right-container';
        
        const btn1 = document.createElement('button');
        btn1.id = 'waterfall';
        btn1.className = 'custom-btn';
        btn1.innerText = '下拉阅读'; // 文案微调，更直观
        
        const btn2 = document.createElement('button');
        btn2.id = 'waterfall2';
        btn2.className = 'custom-btn';
        btn2.innerText = '备用模式'; // 文案微调
        
        rightContainer.appendChild(btn1);
        rightContainer.appendChild(btn2);
        document.body.appendChild(rightContainer);

        // 左侧按钮容器 (复制外链)
        const leftContainer = document.createElement('div');
        leftContainer.className = 'custom-btn-container left-container';
        
        const originBtn = document.createElement('button');
        originBtn.id = 'originBtn';
        originBtn.className = 'custom-btn';
        originBtn.innerText = '复制外链';
        leftContainer.appendChild(originBtn);
        document.body.appendChild(leftContainer);

        // --- 事件逻辑 ---

        // 下拉式1 (主逻辑)
        btn1.addEventListener("click", async function () {
            console.log('Starting Waterfall 1');
            
            // 隐藏按钮防止遮挡视线
            rightContainer.style.display = 'none';
            leftContainer.style.display = 'none';

            // 创建容器
            const pn = document.createElement('div');
            pn.style.textAlign = 'center'; // 图片居中
            const element = document.getElementById('i1');
            if(element) element.appendChild(pn);

            // 显示加载状态
            const statusMsg = document.createElement('div');
            statusMsg.innerText = "正在加载瀑布流...";
            statusMsg.style.cssText = "padding: 10px; color: #666; font-size: 14px;";
            pn.appendChild(statusMsg);

            let lp = location.href;
            let ln = location.href;
            let nextLink = document.getElementById('next');
            let hn = nextLink ? nextLink.href : ln;

            while (hn !== ln && hn) {
                let doc;
                let retries = 0;
                
                // 获取下一页 DOM
                while (!doc && retries < 3) {
                    try {
                        statusMsg.innerText = `正在加载: ${hn.split('-').pop()}...`; // 提示当前页码
                        const data = await fetch(hn).then(resp => resp.text());
                        const parser = new DOMParser();
                        doc = parser.parseFromString(data, "text/html");
                    } catch (e) {
                        console.error(e);
                        retries++;
                        await new Promise(r => setTimeout(r, 1000)); // 失败延迟重试
                    }
                }
                
                if(!doc) break;

                const remoteImg = doc.getElementById('img');
                if (remoteImg) {
                    const imgElem = document.createElement('img');
                    let src = remoteImg.src;
                    
                    // 应用与 fixBaseUrls 相同的替换逻辑，防止图裂
                    if (src.includes('https://s.exhentai.org')) {
                        src = src.replace('https://s.exhentai.org', 'https://ehgt.org');
                    }
                    imgElem.src = src;

                    // 移动端核心样式适配：宽度100%，高度自动
                    imgElem.style.width = '100%';
                    imgElem.style.height = 'auto';
                    imgElem.style.display = 'block';
                    imgElem.style.margin = '0 auto 5px auto'; // 增加一点下间距
                    imgElem.style.maxWidth = '1200px'; // 限制最大宽度，防止PC端过大

                    // 插入图片到提示信息之前
                    pn.insertBefore(imgElem, statusMsg);
                    
                    ln = hn;
                    const nextEl = doc.getElementById('next');
                    hn = nextEl ? nextEl.href : ln;
                } else {
                    break;
                }
            }
            statusMsg.innerText = "--- END ---";
        }, false);

        // 下拉式2
        btn2.addEventListener("click", async function () {
            const currentPath = window.location.pathname;
            const newUrl = '/?host=page.moonchan.xyz#' + currentPath;
            window.location.href = newUrl;
        }, false);

        // 复制外链 (保持原逻辑，增加了简单的UI反馈)
        originBtn.addEventListener("click", function () {
            const currentUrl = window.location.href;
            const hasQuery = currentUrl.includes('?');
            const newUrl = currentUrl + (hasQuery ? '&' : '?') + 'redirect_to=image';

            const originalText = originBtn.innerText;
            
            if (navigator.clipboard) {
                navigator.clipboard.writeText(newUrl)
                    .then(() => {
                        originBtn.innerText = '已复制!';
                        setTimeout(() => originBtn.innerText = originalText, 2000);
                    })
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
                    originBtn.innerText = '已复制!';
                    setTimeout(() => originBtn.innerText = originalText, 2000);
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
