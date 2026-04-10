document.addEventListener("DOMContentLoaded", () => {
    const playerModal = document.getElementById("playerModal");
    const movieFrame = document.getElementById("movieFrame");
    const movieVideo = document.getElementById("movieVideo");
    const closePlayer = document.getElementById("closePlayer");
    const playerTitle = document.getElementById("playerTitle");
    const playerMeta = document.getElementById("playerMeta");

    function openPlayer(card) {
        const title = card.dataset.title;
        const category = card.dataset.category;
        const embedUrl = card.dataset.embed;
        const videoUrl = card.dataset.video;

        playerTitle.textContent = title;
        playerMeta.textContent = category;

        // Reset display
        movieFrame.hidden = true;
        movieVideo.hidden = true;
        movieFrame.src = "";
        movieVideo.src = "";

        if (embedUrl && (embedUrl.includes("youtube.com") || embedUrl.includes("vimeo.com"))) {
            movieFrame.src = embedUrl;
            movieFrame.hidden = false;
        } else if (videoUrl) {
            movieVideo.src = videoUrl;
            movieVideo.hidden = false;
            movieVideo.play().catch(e => console.log("Auto-play blocked:", e));
        }

        playerModal.classList.add("active");
        document.body.style.overflow = "hidden"; // Prevent scrolling
    }

    function stopPlayer() {
        playerModal.classList.remove("active");
        movieFrame.src = "";
        movieVideo.pause();
        movieVideo.src = "";
        document.body.style.overflow = ""; // Restore scrolling
    }

    document.querySelectorAll(".movie-card").forEach((card) => {
        card.addEventListener("click", () => openPlayer(card));
    });

    if (closePlayer) {
        closePlayer.addEventListener("click", stopPlayer);
    }

    // Close modal on escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && playerModal.classList.contains("active")) {
            stopPlayer();
        }
    });

    // Close on backdrop click
    if (playerModal) {
        playerModal.addEventListener("click", (e) => {
            if (e.target === playerModal) {
                stopPlayer();
            }
        });
    }
});
