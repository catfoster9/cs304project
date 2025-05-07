let slideIndexes = {};

function plusSlides(n, roomId) {
    showSlides(slideIndexes[roomId] += n, roomId);
}

function showSlides(n, roomId) {
    let slides = document.querySelectorAll(`.room-${roomId}`);
    if (slides.length === 0) return;

    if (!slideIndexes[roomId]) slideIndexes[roomId] = 1;
    if (n > slides.length) slideIndexes[roomId] = 1;
    if (n < 1) slideIndexes[roomId] = slides.length;

    slides.forEach(slide => slide.style.display = "none");
    slides[slideIndexes[roomId]-1].style.display = "block";
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".slideshow-container").forEach(gallery => {
        const roomId = gallery.id.replace("gallery-", "");
        slideIndexes[roomId] = 1;
        showSlides(1, roomId);
    });
});