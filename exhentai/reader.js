(function() {
    'use strict';

    // =================配置区域=================
    const CONFIG = {
        // 按键设置
        keys: {
            next: 'ArrowLeft',  // 下一张 (因为是RTL，通常习惯左键是往后翻)
            prev: 'ArrowRight', // 上一张
            close: 'Escape',    // 退出阅读
            zoom: 'z'           // 键盘缩放
        },
        // 预加载数量 (当前页的前后各预加载多少张)
        preloadCount: 2
    };
    // =========================================

    class GalleryViewer {
        constructor() {
            this.state = {
                isOpen: false,
                currentIndex: 0,
                pages: [], // 存储 { url: string, imgObj: Image, loaded: bool, nl: string }
                zoom: 1,
                isFetching: false
            };

            this.ui = {};
            this.init();
        }

        init() {
            // 1. 扫描页面上的链接，构建数据源
            // 我们监听 document 的变化，因为前一个脚本可能是异步加载图片的
            const observer = new MutationObserver(() => this.scanLinks());
            const gdt = document.getElementById('gdt');
            if (gdt) {
                observer.observe(gdt, { childList: true, subtree: true });
                this.scanLinks(); // 初次扫描
            }

            // 2. 构建阅读器 UI
            this.createUI();
            
            // 3. 绑定全局键盘事件
            document.addEventListener('keydown', (e) => this.handleKey(e));
        }

        scanLinks() {
            const links = document.querySelectorAll('#gdt a');
            // 只处理新出现的链接，避免重复绑定
            links.forEach((a, index) => {
                if (a.dataset.viewerBound) return;
                
                a.dataset.viewerBound = "true";
                a.dataset.index = index; // 临时索引，后续需动态校准
                
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    // 重新计算当前所有链接，确保索引准确（应对动态加载）
                    const currentLinks = Array.from(document.querySelectorAll('#gdt a'));
                    const realIndex = currentLinks.indexOf(a);
                    this.open(realIndex, currentLinks);
                });
            });
        }

        createUI() {
            // 创建全屏容器
            const container = document.createElement('div');
            container.id = 'js-gallery-viewer';
            Object.assign(container.style, {
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 999999, display: 'none',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', userSelect: 'none'
            });

            // 图片容器
            const imgWrapper = document.createElement('div');
            Object.assign(imgWrapper.style, {
                position: 'relative', width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.2s ease'
            });

            // 图片元素
            const img = document.createElement('img');
            Object.assign(img.style, {
                maxWidth: '100%', maxHeight: '100%', objectFit: 'contain',
                cursor: 'pointer'
            });
            
            // 信息提示
            const info = document.createElement('div');
            Object.assign(info.style, {
                position: 'absolute', bottom: '10px', right: '10px',
                color: '#fff', fontFamily: 'sans-serif', fontSize: '14px',
                backgroundColor: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '4px',
                pointerEvents: 'none'
            });

            // 加载中提示
            const loader = document.createElement('div');
            loader.innerText = 'Loading...';
            Object.assign(loader.style, {
                position: 'absolute', color: '#aaa', fontSize: '20px', display: 'none'
            });

            imgWrapper.appendChild(img);
            container.appendChild(imgWrapper);
            container.appendChild(info);
            container.appendChild(loader);
            document.body.appendChild(container);

            this.ui = { container, imgWrapper, img, info, loader };

            // 绑定点击事件 (翻页/缩放)
            container.addEventListener('click', (e) => this.handleClick(e));
            container.addEventListener('dblclick', (e) => this.toggleZoom(e));
        }

        open(index, linkElements) {
            // 初始化页面列表
            this.state.pages = linkElements.map(el => ({
                pageUrl: el.href,
                src: null, // 真实图片链接
                nl: null   // 失败回退码
            }));
            
            this.state.currentIndex = index;
            this.state.isOpen = true;
            this.ui.container.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // 禁止背景滚动
            
            this.loadPage(index);
        }

        close() {
            this.state.isOpen = false;
            this.state.zoom = 1;
            this.updateZoom();
            this.ui.container.style.display = 'none';
            document.body.style.overflow = '';
        }

        // 核心逻辑：加载页面并解析真实图片
        async loadPage(index) {
            if (index < 0 || index >= this.state.pages.length) return;
            
            this.state.currentIndex = index;
            this.updateInfo();
            this.ui.img.style.display = 'none';
            this.ui.loader.style.display = 'block';
            this.state.zoom = 1;
            this.updateZoom();

            let pageData = this.state.pages[index];

            // 如果还没有解析过图片地址
            if (!pageData.src) {
                try {
                    const imageUrl = await this.fetchImageSrc(pageData.pageUrl);
                    pageData.src = imageUrl;
                } catch (err) {
                    console.error("解析图片失败", err);
                    this.ui.loader.innerText = "Error parsing page";
                    return;
                }
            }

            // 设置图片显示
            this.ui.img.src = pageData.src;
            
            // 图片加载失败处理 (nl 逻辑)
            this.ui.img.onerror = () => this.handleImageError(index);
            
            this.ui.img.onload = () => {
                this.ui.img.style.display = 'block';
                this.ui.loader.style.display = 'none';
                // 成功加载当前页后，预加载周围页面
                this.preload(index);
            };
        }

        // 解析 /s/ 页面获取 #img 和 nl code
        async fetchImageSrc(url) {
            const res = await fetch(url);
            const text = await res.text();
            const doc = new DOMParser().parseFromString(text, 'text/html');
            
            // 1. 获取图片链接
            const imgEl = doc.getElementById('img');
            if (!imgEl) throw new Error("No #img found");

            // 2. 获取 nl (reload code)
            // <a href="#" id="loadfail" onclick="return nl('32682-490787')">
            const failEl = doc.getElementById('loadfail');
            const pageData = this.state.pages.find(p => p.pageUrl === url) || {}; // 获取引用
            
            if (failEl) {
                const match = failEl.getAttribute('onclick').match(/nl\('([^']+)'\)/);
                if (match && match[1]) {
                    // 更新当前页面的 nl 码，供下次失败时使用
                    // 我们需要更新 this.state.pages 里的数据
                    const currentIdx = this.state.pages.findIndex(p => p.pageUrl === url);
                    if(currentIdx !== -1) {
                        this.state.pages[currentIdx].nl = match[1];
                    }
                }
            }

            return imgEl.src;
        }

        async handleImageError(index) {
            const pageData = this.state.pages[index];
            console.log(`Image load failed for index ${index}. Checking for nl code...`);

            if (pageData.nl) {
                this.ui.loader.innerText = "Reloading broken image...";
                this.ui.loader.style.display = 'block';

                // 构造新的 URL: 原URL + ?nl=xxxx
                const baseUrl = pageData.pageUrl.split('?')[0];
                const newUrl = `${baseUrl}?nl=${pageData.nl}`;
                
                console.log(`Refetching via: ${newUrl}`);

                // 更新 pageUrl 防止死循环 (如果新的也失败，会尝试解析新的 nl)
                pageData.pageUrl = newUrl; 
                pageData.src = null; // 清空旧图
                pageData.nl = null;  // 清空旧码

                // 重新走 loadPage 流程，它会触发 fetchImageSrc 去解析新的 HTML
                this.loadPage(index);
            } else {
                this.ui.loader.innerText = "Image Failed (No fallback)";
            }
        }

        preload(currentIndex) {
            const range = CONFIG.preloadCount;
            for (let i = currentIndex - range; i <= currentIndex + range; i++) {
                if (i !== currentIndex && i >= 0 && i < this.state.pages.length) {
                    const page = this.state.pages[i];
                    if (!page.src) {
                        // 仅解析链接，暂不创建 Image 对象占用大量内存，除非你希望极速
                        this.fetchImageSrc(page.pageUrl).then(src => {
                            page.src = src;
                        });
                    }
                }
            }
        }

        handleClick(e) {
            // 如果是双击，会触发 dblclick，这里需要做一个防抖或者简单逻辑分离
            // 但通常 click 和 dblclick 很难完美共存，这里仅做简单区域判定
            
            // 如果当前处于放大模式，点击任何地方通过 toggleZoom 复原，或者拖拽（这里简化为不翻页）
            if (this.state.zoom > 1) return;

            const width = window.innerWidth;
            const x = e.clientX;

            // 逻辑要求：从右到左阅读
            // 左半边 -> 下一页
            // 右半边 -> 上一页
            // 中间 (比如 40%-60%) -> 也可以是放大，或者不做动作防止误触
            
            const leftZone = width * 0.4;
            const rightZone = width * 0.6;

            if (x < leftZone) {
                // 点击左侧 -> 下一页
                this.nextPage();
            } else if (x > rightZone) {
                // 点击右侧 -> 上一页
                this.prevPage();
            } else {
                // 点击中间 -> 可以在这里做其他逻辑，目前留空给双击使用
            }
        }

        toggleZoom(e) {
            if (this.state.zoom === 1) {
                this.state.zoom = 2.5; // 放大倍数
                // 可以计算鼠标位置进行 transform-origin 调整，这里简化为中心放大
                this.ui.img.style.cursor = 'zoom-out';
            } else {
                this.state.zoom = 1;
                this.ui.img.style.cursor = 'pointer';
            }
            this.updateZoom();
        }

        updateZoom() {
            this.ui.imgWrapper.style.transform = `scale(${this.state.zoom})`;
        }

        nextPage() {
            if (this.state.currentIndex < this.state.pages.length - 1) {
                this.loadPage(this.state.currentIndex + 1);
            }
        }

        prevPage() {
            if (this.state.currentIndex > 0) {
                this.loadPage(this.state.currentIndex - 1);
            }
        }

        handleKey(e) {
            if (!this.state.isOpen) return;

            switch(e.key) {
                case CONFIG.keys.next:
                    e.preventDefault();
                    this.nextPage();
                    break;
                case CONFIG.keys.prev:
                    e.preventDefault();
                    this.prevPage();
                    break;
                case CONFIG.keys.close:
                    e.preventDefault();
                    this.close();
                    break;
                case CONFIG.keys.zoom:
                    e.preventDefault();
                    this.toggleZoom();
                    break;
            }
        }

        updateInfo() {
            this.ui.info.innerText = `Page ${this.state.currentIndex + 1} / ${this.state.pages.length}`;
        }
    }

    // 启动脚本
    new GalleryViewer();
    console.log('Gallery Viewer Loaded.');

})();