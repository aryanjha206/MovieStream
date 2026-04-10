document.addEventListener("DOMContentLoaded", () => {
    const movieForm = document.getElementById("movieForm");
    const movieFormTitle = document.getElementById("movieFormTitle");
    const movieSubmitButton = document.getElementById("movieSubmitButton");
    const resetMovieForm = document.getElementById("resetMovieForm");

    function setCreateMode() {
        if (!movieForm) return;
        movieForm.action = "/admin/movies";
        movieFormTitle.innerHTML = '<span style="width: 8px; height: 8px; background: var(--mx-accent); border-radius: 50%;"></span>Upload Intelligence';
        movieSubmitButton.textContent = "Deploy Content";
        movieForm.reset();
    }

    document.querySelectorAll(".edit-movie-trigger").forEach((button) => {
        button.addEventListener("click", () => {
            if (!movieForm) return;
            
            movieForm.action = `/admin/movies/${button.dataset.id}/update`;
            movieFormTitle.innerHTML = '<span style="width: 8px; height: 8px; background: #fbbf24; border-radius: 50%;"></span>Update Entry';
            movieSubmitButton.textContent = "Sync Changes";
            
            document.getElementById("movieTitle").value = button.dataset.title || "";
            document.getElementById("movieCategory").value = button.dataset.category || "Uncategorized";
            document.getElementById("movieThumbnail").value = button.dataset.thumbnail || "";
            document.getElementById("movieVideoUrl").value = button.dataset.video || "";
            document.getElementById("movieDescription").value = button.dataset.description || "";
            document.getElementById("movieTrending").checked = button.dataset.trending === "true";
            
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });

    if (resetMovieForm) {
        resetMovieForm.addEventListener("click", setCreateMode);
    }
});
