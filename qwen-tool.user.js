// ==UserScript==
// @name         Qwen.ai Modular JSX Loader (NPM Style Fixed)
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  在qwen.ai加载多个互相依赖的JSX文件 (修复React Error #130)
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
    // 1. 核心：迷你模块加载器 (修复版)
    // =================================================================
    class SimpleProjectLoader {
        constructor() {
            this.modules = {}; // 存储已导出的模块
        }

        require(path) {
            // 简单处理：忽略相对路径前缀，直接匹配文件名
            const key = path.replace('./', '').replace('.jsx', '').replace('.js', '');
            if (this.modules[key]) {
                return this.modules[key];
            }
            throw new Error(`Module not found: ${path}. Available: ${Object.keys(this.modules).join(', ')}`);
        }

        evalModule(filename, code) {
            try {
                // 1. Babel 编译
                const transformed = Babel.transform(code, {
                    presets: ['env', 'react']
                }).code;

                // 2. 准备环境
                const module = { exports: {} };
                const exports = module.exports;
                const require = this.require.bind(this);
                const React = window.React;
                const ReactDOM = window.ReactDOM;

                // 3. 构造并执行函数
                const func = new Function(
                    'module', 'exports', 'require', 'React', 'ReactDOM',
                    transformed
                );
                func(module, exports, require, React, ReactDOM);

                // 4. 注册模块 (修复点：直接解包 default 导出)
                // 之前的代码在这里做了错误的解构，导致 Function 变成了 Object
                if (module.exports && module.exports.default) {
                    // 如果使用了 export default，直接把 default 的内容作为 require 的返回值
                    // 这样 import X from './X' 就能直接拿到 X，而不是 { default: X }
                    this.modules[filename] = module.exports.default;
                } else {
                    this.modules[filename] = module.exports;
                }

                console.log(`[Loader] Module loaded: ${filename}`);

            } catch (e) {
                console.error(`[Loader] Error in ${filename}:`, e);
            }
        }

        load(fileList) {
            fileList.forEach(file => {
                if (file.content) {
                    this.evalModule(file.name, file.content);
                } else if (file.url) {
                     // 简单同步模拟
                     const self = this;
                     GM_xmlhttpRequest({
                        method: "GET",
                        url: file.url,
                        synchronous: true,
                        onload: function(response) {
                           self.evalModule(file.name, response.responseText);
                        }
                    });
                }
            });
        }

        async runProject(fileList) {
            for (const file of fileList) {
                let code = file.content;
                if (!code && file.url) {
                    code = await this.fetchUrl(file.url);
                }
                this.evalModule(file.name, code);
            }
        }

        fetchUrl(url) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    onload: (res) => resolve(res.responseText),
                    onerror: reject
                });
            });
        }
    }

    // =================================================================
    // 2. 模拟文件 (逻辑不变)
    // =================================================================

    // --- Styles.js ---
    const codeStyles = `
        const styles = {
            container: {
                position: 'fixed', zIndex: 9999, userSelect: 'none', fontFamily: 'sans-serif'
            },
            mainBtn: {
                width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#000',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'grab', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', border: '2px solid #fff', fontSize: '20px'
            },
            menuContainer: {
                position: 'absolute', bottom: '60px', left: '0', display: 'flex', flexDirection: 'column', gap: '8px', width: '120px'
            },
            menuItem: {
                backgroundColor: '#fff', border: '2px solid #000', padding: '10px', cursor: 'pointer', textAlign: 'center', fontSize: '14px', position: 'relative', boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }
        };
        export default styles;
    `;

    // --- DraggableMenu.jsx ---
    const codeComponent = `
        import styles from './Styles';
        const { useState, useEffect } = React;

        const DraggableMenu = () => {
            const [pos, setPos] = useState({ x: 50, y: window.innerHeight - 150 });
            const [isDragging, setIsDragging] = useState(false);
            const [isOpen, setIsOpen] = useState(false);
            const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

            useEffect(() => {
                const handleMove = (e) => {
                    if(!isDragging) return;
                    setPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
                };
                const handleUp = () => setIsDragging(false);
                if(isDragging) {
                    window.addEventListener('mousemove', handleMove);
                    window.addEventListener('mouseup', handleUp);
                }
                return () => {
                    window.removeEventListener('mousemove', handleMove);
                    window.removeEventListener('mouseup', handleUp);
                };
            }, [isDragging, dragOffset]);

            return (
                <div style={{...styles.container, left: pos.x, top: pos.y}}>
                    {isOpen && (
                        <div style={styles.menuContainer}>
                            <div style={styles.menuItem} onClick={() => alert('功能 A 触发')}>功能 A</div>
                            <div style={styles.menuItem} onClick={() => alert('功能 B 触发')}>功能 B</div>
                        </div>
                    )}
                    <div
                        style={styles.mainBtn}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            setIsDragging(true);
                            setDragOffset({x: e.clientX - pos.x, y: e.clientY - pos.y});
                        }}
                        onClick={() => !isDragging && setIsOpen(!isOpen)}
                    >
                        {isOpen ? 'X' : 'Menu'}
                    </div>
                </div>
            );
        };

        export default DraggableMenu;
    `;

    // --- Main.jsx ---
    const codeEntry = `
        import DraggableMenu from './DraggableMenu';

        // 避免重复挂载
        if (!document.getElementById('tm-react-root')) {
            const rootDiv = document.createElement('div');
            rootDiv.id = 'tm-react-root';
            document.body.appendChild(rootDiv);

            const root = ReactDOM.createRoot(rootDiv);
            // 这里的 <DraggableMenu /> 之前因为收到的是 object 而报错，现在修复后收到的是 Function
            root.render(<DraggableMenu />);
            console.log("React Menu Mounted!");
        }
    `;

    // =================================================================
    // 3. 运行
    // =================================================================

    const projectFiles = [
        { name: 'Styles', content: codeStyles },
        { name: 'DraggableMenu', content: codeComponent },
        { name: 'Main', content: codeEntry }
    ];
    const projectFilesRemote = [
        // 场景 B: 使用真实 URL (取消注释并替换 URL)
         { name: 'Interceptor', url: 'https://gist.githubusercontent.com/Hana-ame/6dc5abdab8aa22577e1cfa1c2a4b5233/raw/39bcefa46648d64f8a79739a7fae82d8f66b24ce/Interceptor.js' },
         { name: 'Controller', url: 'https://gist.githubusercontent.com/Hana-ame/6dc5abdab8aa22577e1cfa1c2a4b5233/raw/d3cb3db2f66c40ee113771580a581a99a7fcecfe/Controller.js' },
         { name: 'Styles', url: 'https://gist.githubusercontent.com/Hana-ame/6dc5abdab8aa22577e1cfa1c2a4b5233/raw/fa6e3f87fd2746dc41481a9a5a8e4eed1b6a7d18/Styles.js' },
         { name: 'DraggableMenu', url: 'https://gist.githubusercontent.com/Hana-ame/6dc5abdab8aa22577e1cfa1c2a4b5233/raw/fa6e3f87fd2746dc41481a9a5a8e4eed1b6a7d18/Menu.jsx' },
         { name: 'Main', url: 'https://gist.githubusercontent.com/Hana-ame/6dc5abdab8aa22577e1cfa1c2a4b5233/raw/fa6e3f87fd2746dc41481a9a5a8e4eed1b6a7d18/Index.jsx' }
    ];

    const loader = new SimpleProjectLoader();

    setTimeout(() => {
        // 使用 async 方式运行，确保加载顺序
        loader.runProject(projectFilesRemote);
    }, 1500);

})();
