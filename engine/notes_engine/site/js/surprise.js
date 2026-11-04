// Surprise banner: on about 1 visit in 5, an "important new content" banner links to a Rickroll.
// It opens in a new tab and disappears once clicked.
if (Math.random() < 0.2) {
  const banner = document.createElement("a");
  banner.id = "surprise";
  banner.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  banner.target = "_blank";
  banner.rel = "noopener";
  banner.innerHTML = "⚠ IMPORTANT NEW CONTENT <small>click to open</small>";
  banner.addEventListener("click", () => banner.remove());
  document.body.append(banner);
}

