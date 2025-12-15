// ==UserScript==
// @name         Jandan Cleanup: Remove Admin Comments & Logo-BG
// @namespace    http://tampermonkey.net/
// @version      1.0.Merged
// @description  合并脚本：删除包含 author-admin 的评论行 + 去除 logo-bg 类名元素
// @author       Merged
// @match        *://jandan.net/*
// @match        *://i.jandan.net/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

//## [Google AI Studio](https://aistudio.google.com/prompts/1KF02zUC3N0njFlZ5zOmD0_Pkts6IBuOF)

(function() {
    'use strict';

    // --- 功能 1：CSS 强力覆盖 (针对 Logo-BG) ---
    // 使用 CSS 是最高效的隐藏方式，可以防止元素在 JS 执行前一闪而过
    GM_addStyle(`
        [class*="logo-bg"] {
            background-image: none !important;
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
    `);

    // --- 功能 2：JS 逻辑处理 ---

    /**
     * 逻辑 A: 删除管理员评论
     */
    function removeAdminComments() {
        // 查找所有评论行
        const commentDivs = document.querySelectorAll('div.comment-row.p-2');
        commentDivs.forEach(div => {
            // 检查内部是否含有管理员标识
            const adminSpan = div.querySelector('span.author-admin');
            if (adminSpan) {
                div.remove();
                // console.log('Admin comment removed'); // 调试用
            }
        });
    }

    /**
     * 逻辑 B: 清除 Logo-BG 元素的类名和内联样式 (作为 CSS 的补充)
     */
    function removeLogoBg() {
        const logoElements = document.querySelectorAll('[class*="logo-bg"]');
        logoElements.forEach(element => {
            element.classList.remove('logo-bg');
            element.style.cssText = '';
        });
    }

    /**
     * 主执行函数：按顺序执行所有清理任务
     */
    function runAllCleanups() {
        removeAdminComments();
        removeLogoBg();
    }

    // --- 性能优化：防抖函数 ---
    // 避免在页面加载或动态加载大量内容时频繁触发重绘
    function debounce(func, delay) {
        let timer;
        return function() {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, arguments), delay);
        };
    }

    // 创建防抖后的执行函数 (延迟 300ms)
    const debouncedRun = debounce(runAllCleanups, 300);

    // --- 初始化与监听 ---

    // 1. 页面刚开始加载时先尝试执行一次 (配合 @run-at document-start)
    // 此时 DOM 可能未完全就绪，但 CSS 注入已生效
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runAllCleanups);
    } else {
        runAllCleanups();
    }

    // 2. 设置观察者监听动态加载的内容 (如点击“加载更多”评论)
    const observer = new MutationObserver(function(mutations) {
        let shouldRun = false;
        mutations.forEach(function(mutation) {
            // 只有当有节点添加或属性变化时才触发
            if (mutation.addedNodes.length > 0 || mutation.type === 'attributes') {
                shouldRun = true;
            }
        });

        if (shouldRun) {
            debouncedRun();
        }
    });

    // 开始监听 body
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true // 监听属性变化，防止样式被动态脚本加回来
    });

})();
