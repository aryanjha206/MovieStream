const movieForm = document.getElementById("movieForm");
const movieFormTitle = document.getElementById("movieFormTitle");
const movieSubmitButton = document.getElementById("movieSubmitButton");
const resetMovieForm = document.getElementById("resetMovieForm");

function setCreateMode() {
    movieForm.action = "/admin/movies";
    movieFormTitle.textContent = "Add Movie";
    movieSubmitButton.textContent = "Save Movie";
    movieForm.reset();
}

document.querySelectorAll(".edit-movie-trigger").forEach((button) => {
    button.addEventListener("click", () => {
        movieForm.action = `/admin/movies/${button.dataset.id}/update`;
        movieFormTitle.textContent = "Edit Movie";
        movieSubmitButton.textContent = "Update Movie";
        document.getElementById("movieTitle").value = button.dataset.title;
        document.getElementById("movieCategory").value = button.dataset.category;
        document.getElementById("movieThumbnail").value = button.dataset.thumbnail;
        document.getElementById("movieVideoUrl").value = button.dataset.video;
        document.getElementById("movieDescription").value = button.dataset.description;
        document.getElementById("movieTrending").checked = button.dataset.trending === "true";
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
});

if (resetMovieForm) {
    resetMovieForm.addEventListener("click", setCreateMode);
}
