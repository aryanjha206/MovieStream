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
        card.addEventListener("click", (e) => {
            // Check if watchlist button was clicked
            if (e.target.closest('.watchlist-btn')) {
                e.stopPropagation();
                const btn = e.target.closest('.watchlist-btn');
                const icon = btn.querySelector('i');
                const isAdded = btn.classList.toggle('added');
                
                // Sync with server
                fetch('/api/watchlist/toggle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ movie_id: card.dataset.id })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        if (data.action === 'added') {
                            btn.style.background = 'var(--mx-accent)';
                            btn.style.color = 'white';
                            icon.setAttribute('data-lucide', 'check');
                            showToast(`Saved to Catalog`);
                        } else {
                            btn.style.background = 'rgba(0,0,0,0.4)';
                            btn.style.color = 'white';
                            icon.setAttribute('data-lucide', 'plus');
                            showToast(`Removed from Watchlist`);
                        }
                        if (window.lucide) lucide.createIcons();
                    }
                })
                .catch(err => {
                    console.error("Watchlist sync failed:", err);
                    showToast("Sync failed. Check connection.");
                });
                
                return;
            }
            openPlayer(card);
        });
    });

    function showToast(message) {
        const stack = document.querySelector('.flash-stack') || createFlashStack();
        const toast = document.createElement('div');
        toast.className = 'flash flash-success';
        toast.innerHTML = `<span>${message}</span>`;
        stack.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 600);
        }, 3000);
    }

    function createFlashStack() {
        const stack = document.createElement('div');
        stack.className = 'flash-stack';
        document.body.appendChild(stack);
        return stack;
    }

    // Spotlight Rotation Logic
    const spotlightCards = document.querySelectorAll(".spotlight-card");
    const heroTitle = document.getElementById("heroTitle");
    const heroCategory = document.getElementById("heroCategory");
    const heroPlayButton = document.getElementById("heroPlayButton");
    let currentSpotlightIndex = 0;

    function updateSpotlight(index) {
        if (spotlightCards.length === 0) return;
        
        spotlightCards.forEach(c => c.classList.remove("active"));
        const card = spotlightCards[index];
        card.classList.add("active");

        if (heroTitle) heroTitle.textContent = card.dataset.title;
        if (heroCategory) heroCategory.textContent = card.dataset.category;
        
        // Update Hero Background
        const heroSection = document.querySelector(".dashboard-hero");
        if (heroSection && card.dataset.thumbnail) {
            heroSection.style.setProperty("--hero-bg", `url('${card.dataset.thumbnail}')`);
        }
        
        // Update Play Button behavior
        if (heroPlayButton) {
            heroPlayButton.onclick = () => openPlayer(card);
        }
    }

    if (spotlightCards.length > 0) {
        updateSpotlight(0);
        setInterval(() => {
            currentSpotlightIndex = (currentSpotlightIndex + 1) % spotlightCards.length;
            updateSpotlight(currentSpotlightIndex);
        }, 3000); // 3-second cycle
    }

    if (closePlayer) {
        closePlayer.addEventListener("click", stopPlayer);
    }

    // Dashboard specific initializations
    if (window.lucide) lucide.createIcons();

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
