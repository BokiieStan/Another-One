const socket = io();
const container = document.getElementById("bubbleContainer");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");

function addBubble(post) {
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.style.top = Math.random() * 80 + "vh";
    bubble.style.left = Math.random() * 80 + "vw";
    bubble.innerHTML = `<p>${post.name}</p>` + (post.file ? `<img src="${post.file}">` : "");
    container.appendChild(bubble);
}

fetch("/posts")
    .then(res => res.json())
    .then(data => data.forEach(addBubble));

socket.on("newPost", addBubble);

uploadBtn.onclick = () => fileInput.click();

fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    fetch("/upload", {
        method: "POST",
        body: formData
    }).then(() => fileInput.value = "");
};
