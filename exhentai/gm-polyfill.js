// gm-polyfill.js
(function() {
    window.GM_info = {
        script: { version: '1.0', name: 'Bundled Script' },
        scriptHandler: 'MyWebsitePolyfill'
    };

    // 1. 模拟 GM_addStyle
    window.GM_addStyle = function(css) {
        const style = window.document.createElement('style');
        style.textContent = css;
        window.document.head.appendChild(style);
    };

    // 2. 模拟 GM_setValue 和 GM_getValue (使用 localStorage)
    window.GM_setValue = function(key, value) {
        localStorage.setItem('GM_' + key, JSON.stringify(value));
    };

    window.GM_getValue = function(key, defaultValue) {
        const value = localStorage.getItem('GM_' + key);
        return value ? JSON.parse(value) : defaultValue;
    };

    window.GM_deleteValue = function(key) {
        localStorage.removeItem('GM_' + key);
    };

    // 3. 模拟 GM_log
    window.GM_log = console.log;

    // 4. 模拟 GM_openInTab
    window.GM_openInTab = function(url) {
        return window.open(url, '_blank');
    };

    // 5. 模拟 GM_xmlhttpRequest (最难的部分，受限于同源策略)
    window.GM_xmlhttpRequest = function(details) {
        // 注意：这无法绕过跨域限制 (CORS)
        // 油猴插件能跨域是因为它有浏览器底层权限，普通网页 JS 不行
        const xhr = new XMLHttpRequest();
        xhr.open(details.method || 'GET', details.url);
        if (details.headers) {
            Object.keys(details.headers).forEach(key => {
                xhr.setRequestHeader(key, details.headers[key]);
            });
        }
        xhr.onload = () => details.onload && details.onload(xhr);
        xhr.onerror = () => details.onerror && details.onerror(xhr);
        xhr.send(details.data);
    };

    // 如果脚本使用的是新版的 GM.xxx 语法
    window.GM = {
        addStyle: window.GM_addStyle,
        setValue: window.GM_setValue,
        getValue: window.GM_getValue,
        xmlHttpRequest: window.GM_xmlhttpRequest
        // ... 继续扩展
    };
})();
