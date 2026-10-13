try { const t = localStorage.getItem("theme"); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
try { const v = localStorage.getItem("view"); if (v) document.documentElement.dataset.view = v; } catch (e) {}
