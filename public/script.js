const socket = io();
const container = document.getElementById("bubbleContainer");
const uploadBtn = document.getElementById("uploadBtn");
const textBtn = document.getElementById("textBtn");
const fileInput = document.getElementById("fileInput");

// Modal elements
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const modalClose = document.getElementById("modalClose");
const viewer = document.getElementById("viewer");
const meta = document.getElementById("meta");
const commentList = document.getElementById("commentList");
const commentForm = document.getElementById("commentForm");
const commentInput = document.getElementById("commentInput");

// Local state of posts for quick lookup
const postMap = new Map();
let currentPostId = null;

function randomPos(percent = 80) {
  return Math.random() * percent + (100 - percent) / 2 + "%"; // keep more centered
}

function createBubbleElement(post) {
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.style.top = randomPos(80);
  bubble.style.left = randomPos(80);

  const label = document.createElement("p");
  label.textContent = post.name;
  bubble.appendChild(label);

  // Small preview/icon per type
  if (post.type === "text" && post.text) {
    const snippet = document.createElement("div");
    snippet.textContent = post.text.slice(0, 60);
    snippet.style.fontSize = "0.9rem";
    snippet.style.maxWidth = "160px";
    bubble.appendChild(snippet);
  } else if (post.file) {
    if (post.mimeType && post.mimeType.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = post.file;
      bubble.appendChild(img);
    } else {
      const icon = document.createElement("div");
      icon.textContent = mimeIcon(post.mimeType, post.originalName);
      icon.style.fontSize = "2rem";
      bubble.appendChild(icon);
    }
  }

  bubble.addEventListener("click", () => openModal(post.id));
  return bubble;
}

function addBubble(post) {
  postMap.set(post.id, post);
  const bubble = createBubbleElement(post);
  container.appendChild(bubble);
}

function mimeIcon(mime, name) {
  if (!mime && name) {
    const ext = name.split(".").pop().toLowerCase();
    if (["jpg","jpeg","png","gif","webp","bmp","svg"].includes(ext)) return "🖼️";
    if (["mp4","webm","ogg","mov"].includes(ext)) return "🎞️";
    if (["mp3","wav","ogg","m4a"].includes(ext)) return "🎵";
    if (["pdf"].includes(ext)) return "📄";
    if (["txt","md","log"].includes(ext)) return "📝";
    return "📎";
  }
  if (!mime) return "📎";
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.startsWith("video/")) return "🎞️";
  if (mime.startsWith("audio/")) return "🎵";
  if (mime === "application/pdf") return "📄";
  if (mime.startsWith("text/")) return "📝";
  return "📎";
}

function renderViewer(post) {
  viewer.innerHTML = "";
  if (post.type === "text" && post.text) {
    const pre = document.createElement("pre");
    pre.textContent = post.text;
    viewer.appendChild(pre);
    return;
  }
  if (post.file) {
    const mime = post.mimeType || "";
    if (mime.startsWith("image/")) {
      const img = document.createElement("img");
      img.src = post.file;
      viewer.appendChild(img);
    } else if (mime.startsWith("video/")) {
      const video = document.createElement("video");
      video.controls = true;
      const src = document.createElement("source");
      src.src = post.file;
      src.type = mime;
      video.appendChild(src);
      viewer.appendChild(video);
    } else if (mime.startsWith("audio/")) {
      const audio = document.createElement("audio");
      audio.controls = true;
      const src = document.createElement("source");
      src.src = post.file;
      src.type = mime;
      audio.appendChild(src);
      viewer.appendChild(audio);
    } else if (mime === "application/pdf") {
      const iframe = document.createElement("iframe");
      iframe.src = post.file;
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      viewer.appendChild(iframe);
    } else {
      const link = document.createElement("a");
      link.href = post.file;
      link.textContent = "Open file";
      link.target = "_blank";
      viewer.appendChild(link);
    }
  } else {
    viewer.textContent = "No preview available.";
  }
}

function renderMeta(post) {
  const date = new Date(post.createdAt || Date.now());
  meta.textContent = `${post.name} • ${date.toLocaleString()}${post.originalName ? " • " + post.originalName : ""}`;
}

function renderComments(post) {
  commentList.innerHTML = "";
  (post.comments || []).forEach(c => {
    const li = document.createElement("li");
    const d = new Date(c.createdAt || Date.now());
    li.textContent = `${d.toLocaleTimeString()}: ${c.text}`;
    commentList.appendChild(li);
  });
}

function openModal(postId) {
  currentPostId = postId;
  const post = postMap.get(postId);
  if (!post) return;
  renderViewer(post);
  renderMeta(post);
  renderComments(post);
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  currentPostId = null;
}

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

commentForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!currentPostId) return;
  const text = commentInput.value.trim();
  if (!text) return;
  fetch(`/posts/${currentPostId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  }).then(r => r.json()).then(() => {
    commentInput.value = "";
  });
});

// Initial load
fetch("/posts")
  .then(res => res.json())
  .then(data => data.forEach(addBubble));

// Real-time updates
socket.on("newPost", (post) => {
  addBubble(post);
});

socket.on("newComment", ({ postId, comment }) => {
  const post = postMap.get(postId);
  if (!post) return;
  post.comments = post.comments || [];
  post.comments.push(comment);
  if (currentPostId === postId) {
    renderComments(post);
  }
});

// Upload flow
uploadBtn.onclick = () => fileInput.click();

fileInput.onchange = () => {
  const file = fileInput.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("file", file);
  fetch("/upload", {
    method: "POST",
    body: formData
  }).then(() => (fileInput.value = ""));
};

// Text post flow
textBtn.onclick = async () => {
  const text = prompt("Enter text for your bubble:");
  if (!text || !text.trim()) return;
  await fetch("/postText", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: text.trim() })
  });
};
