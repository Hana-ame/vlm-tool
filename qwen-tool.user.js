// ==UserScript==
// @name         Qwen.ai Modular JSX Loader (Feature Toggles)
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Qwen.ai 自动化代理 (支持 Thinking/Search 开关)
// @author       You
// @match        https://chat.qwen.ai/*
// @match        https://qwen.ai/*
// @grant        GM_xmlhttpRequest
// @grant        GM_webSocket
// @grant        unsafeWindow
// @require      https://unpkg.com/react@18/umd/react.production.min.js
// @require      https://unpkg.com/react-dom@18/umd/react-dom.production.min.js
// @require      https://unpkg.com/@babel/standalone/babel.min.js
// ==/UserScript==

(function() {
    'use strict';

    // =================================================================
    // 1. 核心：模块加载器
    // =================================================================
    class SimpleProjectLoader {
        constructor() { this.modules = {}; }

        require(path) {
            const key = path.replace('./', '').replace('.jsx', '').replace('.js', '');
            if (this.modules[key]) return this.modules[key];
            throw new Error(`Module not found: ${path}`);
        }

        evalModule(filename, code) {
            try {
                const transformed = Babel.transform(code, { presets: ['env', 'react'] }).code;
                const module = { exports: {} };
                const func = new Function('module', 'exports', 'require', 'React', 'ReactDOM', transformed);
                func(module, module.exports, this.require.bind(this), window.React, window.ReactDOM);
                
                this.modules[filename] = (module.exports && module.exports.default) ? module.exports.default : module.exports;
                console.log(`[Loader] Module loaded: ${filename}`);
            } catch (e) { console.error(`[Loader] Error in ${filename}:`, e); }
        }

        async runProject(fileList) {
            for (const file of fileList) {
                let code = file.content;
                if (!code && file.url) {
                    code = await new Promise((resolve, reject) => {
                        GM_xmlhttpRequest({
                            method: "GET", url: file.url,
                            onload: (res) => resolve(res.responseText), onerror: reject
                        });
                    });
                }
                this.evalModule(file.name, code);
            }
        }
    }

    // =================================================================
    // 2. 核心逻辑代码 (Interceptor & Controller)
    // =================================================================

    // --- Interceptor.js: 负责拦截 Fetch 流 ---
    const codeInterceptor = `
        const originalFetch = window.fetch;
        window.__CURRENT_REQ_ID = null; 
        window.__WS_CLIENT = null;

        async function logStreamReader(stream) {
            const reader = stream.getReader();
            const decoder = new TextDecoder("utf-8");
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    if (window.__WS_CLIENT && window.__WS_CLIENT.readyState === WebSocket.OPEN && window.__CURRENT_REQ_ID) {
                        window.__WS_CLIENT.send(JSON.stringify({
                            type: 'chunk', req_id: window.__CURRENT_REQ_ID, payload: chunk
                        }));
                    }
                }
            } catch (err) {
                if (window.__WS_CLIENT && window.__CURRENT_REQ_ID) {
                     window.__WS_CLIENT.send(JSON.stringify({ type: 'error', req_id: window.__CURRENT_REQ_ID, payload: err.toString() }));
                }
            } finally {
                if (window.__WS_CLIENT && window.__WS_CLIENT.readyState === WebSocket.OPEN && window.__CURRENT_REQ_ID) {
                    window.__WS_CLIENT.send(JSON.stringify({ type: 'done', req_id: window.__CURRENT_REQ_ID }));
                    window.__CURRENT_REQ_ID = null;
                }
            }
        }

        window.fetch = async function(input, init) {
            const response = await originalFetch(input, init);
            const url = (typeof input === 'string') ? input : input.url;
            if (url && url.includes('/api/v2/chat/completions')) {
                console.log("[Interceptor] Hijacked:", url);
                const [stream1, stream2] = response.body.tee();
                logStreamReader(stream2);
                return new Response(stream1, {
                    status: response.status, statusText: response.statusText, headers: response.headers
                });
            }
            return response;
        };
        console.log("Interceptor Loaded");
    `;

    // --- Controller.js: 负责 WS 通信和 DOM 操作 (包含 Thinking/Search) ---
    const codeController = `
        const connectWS = () => {
            const ws = new WebSocket('ws://localhost:8080/ws');
            window.__WS_CLIENT = ws;

            ws.onopen = () => console.log("Connected to Go Server");
            
            ws.onmessage = async (event) => {
                const msg = JSON.parse(event.data);
                if (msg.type === 'execute') {
                    console.log("[Controller] Command:", msg);
                    window.__CURRENT_REQ_ID = msg.req_id;

                    // 1. 切换会话
                    if (msg.chat_id) {
                        await switchToChat(msg.chat_id);
                    } else {
                        await startNewChat();
                    }

                    // 2. 设置功能开关 (Thinking / Search)
                    await setFeatureStates(msg.thinking, msg.search);

                    // 3. 输入并发送
                    await typeAndSend(msg.payload);
                }
            };

            ws.onclose = () => {
                console.log("WS Closed, retry in 3s");
                setTimeout(connectWS, 3000);
            };
        };

        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        // 设置开关状态
        const setFeatureStates = async (targetThinking, targetSearch) => {
            // 选择器基于 DOM 分析
            const thinkingBtn = document.querySelector('.chat-message-input-thinking-budget-btn .chat-input-feature-btn');
            const searchBtn = document.querySelector('.action-bar-left-btns > .chat-input-feature-btn');

            const toggle = async (btn, targetState, name) => {
                if (!btn) {
                    console.warn(name + " button not found");
                    return;
                }
                const isActive = btn.classList.contains('active');
                if (isActive !== targetState) {
                    btn.click();
                    console.log(\`Toggled \${name} to \${targetState}\`);
                    await sleep(200); // 稍微等待 UI 响应
                }
            };

            await toggle(thinkingBtn, targetThinking || false, "Thinking");
            await toggle(searchBtn, targetSearch || false, "Search");
        };

        const startNewChat = async () => {
            const btn = document.querySelector('.sidebar-new-chat');
            if (btn) {
                btn.click();
                await sleep(800);
            }
        };

        const switchToChat = async (uuid) => {
            if (!window.location.href.includes(uuid)) {
                history.pushState({}, '', '/c/' + uuid);
                window.dispatchEvent(new Event('popstate'));
                await sleep(1500); 
            }
        };

        const typeAndSend = async (text) => {
            const textarea = document.getElementById('chat-input');
            if (!textarea) return;
            
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
            nativeSetter.call(textarea, text);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            
            await sleep(300);

            const btn = document.querySelector('.chat-prompt-send-button button') || document.querySelector('.send-button');
            if (btn && !btn.disabled) {
                btn.click();
            } else {
                console.error("Send btn disabled");
                if(window.__WS_CLIENT) {
                    window.__WS_CLIENT.send(JSON.stringify({
                        type: 'error', req_id: window.__CURRENT_REQ_ID, payload: "Send button failure"
                    }));
                }
            }
        };

        setTimeout(connectWS, 2000);
    `;

    // =================================================================
    // 3. 运行
    // =================================================================

    // 定义文件列表：
    // Interceptor 和 Controller 使用本地最新字符串
    // UI 组件继续使用 Gist (如果不需要修改 UI 的话) 或 之前的本地字符串
    const projectFiles = [
        { name: 'Interceptor', content: codeInterceptor },
        { name: 'Controller', content: codeController },
        
        // UI 部分保持不变，从 Gist 加载，或者你可以把之前代码里的 styles/menu 字符串放回来
        { name: 'Styles', url: 'https://gist.githubusercontent.com/Hana-ame/6dc5abdab8aa22577e1cfa1c2a4b5233/raw/fa6e3f87fd2746dc41481a9a5a8e4eed1b6a7d18/Styles.js' },
        { name: 'DraggableMenu', url: 'https://gist.githubusercontent.com/Hana-ame/6dc5abdab8aa22577e1cfa1c2a4b5233/raw/fa6e3f87fd2746dc41481a9a5a8e4eed1b6a7d18/Menu.jsx' },
        { name: 'Main', url: 'https://gist.githubusercontent.com/Hana-ame/6dc5abdab8aa22577e1cfa1c2a4b5233/raw/fa6e3f87fd2746dc41481a9a5a8e4eed1b6a7d18/Index.jsx' }
    ];

    const loader = new SimpleProjectLoader();

    setTimeout(() => {
        loader.runProject(projectFiles);
    }, 1500);

})();
