(async function () {
  // -----------------------------------------------------------
  // 1. 爬虫与智能缓存模块
  // -----------------------------------------------------------
  const gdt = document.querySelector("#gdt") || document.querySelector(".gdt");
  let PAGE_URLS = gdt
    ? Array.from(gdt.querySelectorAll("a"))
        .map((a) => a.href)
        .filter((href) => href.includes("/s/"))
    : [];

  const CACHE = {}; // 结果缓存 (URL)
  const REQS = {}; // 请求去重池 (Promise)

  // 获取图片地址 (自动去重 + 缓存)
  const getSrc = (index) => {
    if (index < 0 || index >= PAGE_URLS.length) return Promise.resolve(null);
    if (CACHE[index]) return Promise.resolve(CACHE[index]);
    if (REQS[index]) return REQS[index];

    const p = fetch(PAGE_URLS[index])
      .then((r) => r.text())
      .then((html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const img = doc.getElementById("img");
        const src = img ? img.src : null;
        if (src) CACHE[index] = src;
        delete REQS[index];
        return src;
      })
      .catch(() => {
        delete REQS[index];
        return null;
      });

    REQS[index] = p;
    return p;
  };

  // 预加载器
  const preload = (i) => {
    for (let j = 1; j <= 10; j++)
      getSrc(i + j).then((u) => u && (new Image().src = u));
  };
  preload(0);

  // -----------------------------------------------------------
  // 2. 依赖加载
  // -----------------------------------------------------------
  const loadScript = (src) =>
    new Promise((r) => {
      if (document.querySelector(`script[src="${src}"]`)) return r();
      const s = document.createElement("script");
      s.src = src;
      s.crossOrigin = "anonymous";
      s.onload = r;
      document.head.append(s);
    });

  try {
    await loadScript("https://unpkg.com/react@18/umd/react.production.min.js");
    await loadScript(
      "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"
    );
  } catch (e) {
    return console.error(e);
  }

  // -----------------------------------------------------------
  // 3. 启动按钮
  // -----------------------------------------------------------
  const btn = document.createElement("button");
  btn.innerText = "Start Ultimate Reader";
  btn.style.cssText =
    "position:fixed; top:10px; right:10px; z-index:999999; padding:10px; background:#e91e63; color:#fff; border:none; cursor:pointer; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.5); border-radius:4px;";
  document.body.append(btn);

  // -----------------------------------------------------------
  // 4. React 组件
  // -----------------------------------------------------------
  btn.onclick = () => {
    PAGE_URLS = gdt
      ? Array.from(gdt.querySelectorAll("a"))
          .map((a) => a.href)
          .filter((href) => href.includes("/s/"))
      : [];

    if (!PAGE_URLS.length) return alert("No links");
    document.body.innerHTML = '<div id="root"></div>';
    Object.assign(document.body.style, {
      margin: "0",
      background: "#000",
      overflow: "hidden",
    });

    const { useState, useEffect, useRef, createElement: h } = window.React;
    const { createRoot } = window.ReactDOM;

    const App = () => {
      const [index, setIndex] = useState(0);
      const [src, setSrc] = useState(null);

      // 视图状态
      const [scale, setScale] = useState(1);
      const [offset, setOffset] = useState({ x: 0, y: 0 });
      const [isDragging, setIsDragging] = useState(false);

      const dragStart = useRef({ x: 0, y: 0 });
      const lastOffset = useRef({ x: 0, y: 0 });
      const lastTap = useRef(0);

      // 翻页
      const next = () => setIndex((i) => Math.min(i + 1, PAGE_URLS.length - 1));
      const prev = () => setIndex((i) => Math.max(i - 1, 0));

      // 键盘监听
      useEffect(() => {
        const k = (e) => {
          if (e.key === "ArrowLeft") next();
          if (e.key === "ArrowRight") prev();
        };
        window.addEventListener("keydown", k);
        return () => window.removeEventListener("keydown", k);
      }, []);

      // 核心逻辑：页码变化
      useEffect(() => {
        let m = true;
        // 1. 重置视图
        setScale(1);
        setOffset({ x: 0, y: 0 });
        lastOffset.current = { x: 0, y: 0 };

        // 2. 先清空 src，确保 React 知道状态变了
        setSrc(null);

        // 3. 获取新图
        getSrc(index).then((u) => {
          if (m && u) setSrc(u);
        });

        // 4. 预加载
        preload(index);
        return () => (m = false);
      }, [index]);

      // 手势
      const pDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
      };
      const pMove = (e) => {
        if (isDragging)
          setOffset({
            x: lastOffset.current.x + (e.clientX - dragStart.current.x),
            y: lastOffset.current.y + (e.clientY - dragStart.current.y),
          });
      };
      const pUp = (e) => {
        setIsDragging(false);
        lastOffset.current = offset;
        if (
          Math.hypot(
            e.clientX - dragStart.current.x,
            e.clientY - dragStart.current.y
          ) > 10
        )
          return;

        const w = window.innerWidth;
        const x = e.clientX;
        const now = Date.now();

        if (scale === 1) {
          if (x < w * 0.35) return next();
          if (x > w * 0.65) return prev();
        }

        if (x >= w * 0.35 && x <= w * 0.65) {
          if (now - lastTap.current < 300) {
            if (scale === 1) setScale(2);
            else {
              setScale(1);
              setOffset({ x: 0, y: 0 });
              lastOffset.current = { x: 0, y: 0 };
            }
            lastTap.current = 0;
          } else lastTap.current = now;
        }
      };

      // 渲染：使用 Grid 堆叠 Loading 和 Image
      return h(
        "div",
        {
          style: {
            display: "grid",
            placeItems: "center", // 堆叠布局
            width: "100vw",
            height: "100vh",
            background: "#000",
            overflow: "hidden",
            touchAction: "none",
            userSelect: "none",
            cursor: isDragging ? "grabbing" : "default",
          },
          onPointerDown: pDown,
          onPointerMove: pMove,
          onPointerUp: pUp,
          onPointerLeave: () => setIsDragging(false),
        },
        [
          // Layer 1: Loading 文字 (永远存在于底层)
          h(
            "div",
            {
              key: "loader",
              style: {
                gridArea: "1/1", // 放在 grid 第1格
                color: "#666",
                fontSize: "20px",
                fontWeight: "bold",
                zIndex: 0,
              },
            },
            src ? "Loading Image..." : "Fetching Info..."
          ),

          // Layer 2: 图片 (在上层)
          // key={index} 是关键：强制销毁旧图，不显示旧帧
          src &&
            h("img", {
              key: index,
              src: src,
              draggable: false,
              style: {
                gridArea: "1/1", // 同样放在 grid 第1格，覆盖文字
                maxWidth: "100vw",
                maxHeight: "100vh",
                objectFit: "contain",
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transition: isDragging ? "none" : "transform 0.2s",
                pointerEvents: "none",
                zIndex: 1,
                willChange: "transform",
              },
            }),

          // Layer 3: 页码
          h(
            "div",
            {
              style: {
                position: "absolute",
                bottom: 20,
                color: "#ccc",
                background: "rgba(0,0,0,0.5)",
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: "12px",
                pointerEvents: "none",
                zIndex: 2,
              },
            },
            `${index + 1} / ${PAGE_URLS.length}`
          ),
        ]
      );
    };

    createRoot(document.getElementById("root")).render(h(App));
  };
})();
