const modal = document.getElementById("playerModal");
const frame = document.getElementById("movieFrame");
const video = document.getElementById("movieVideo");
const title = document.getElementById("playerTitle");
const meta = document.getElementById("playerMeta");
const closePlayer = document.getElementById("closePlayer");

function openPlayer(card) {
    const movieTitle = card.dataset.title || "Now Playing";
    const category = card.dataset.category || "";
    const description = card.dataset.description || "";
    const embedUrl = card.dataset.embed || "";
    const videoUrl = card.dataset.video || "";

    title.textContent = movieTitle;
    meta.textContent = [category, description].filter(Boolean).join(" | ");

    if (embedUrl && (embedUrl.includes("youtube.com/embed") || embedUrl.includes("vimeo.com/video"))) {
        frame.hidden = false;
        video.hidden = true;
        frame.src = embedUrl;
        video.pause();
        video.removeAttribute("src");
    } else {
        frame.hidden = true;
        frame.src = "";
        video.hidden = false;
        video.src = videoUrl;
        video.load();
    }

    modal.classList.add("active");
}

function closePlayerModal() {
    modal.classList.remove("active");
    frame.src = "";
    video.pause();
    video.removeAttribute("src");
}

document.querySelectorAll(".movie-card").forEach((card) => {
    card.addEventListener("click", () => openPlayer(card));
});

if (closePlayer) {
    closePlayer.addEventListener("click", closePlayerModal);
}

if (modal) {
    modal.addEventListener("click", (event) => {
        if (event.target === modal) {
            closePlayerModal();
        }
    });
}
