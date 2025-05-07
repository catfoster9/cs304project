document.addEventListener("DOMContentLoaded", () => {

    const viewerModal = document.getElementById("viewerModal");
    const viewerContent = document.getElementById("viewerContent");
    const viewerCloseBtn = document.querySelector(".viewer-close");

    // Enlarge image/video on click
    document.addEventListener("click", function(e) {
        if (e.target.matches(".enlargeable")) {
            viewerModal.style.display = "block";
            viewerContent.innerHTML = "";  // Clear old content

            if (e.target.tagName === "IMG") {
                const img = document.createElement("img");
                img.src = e.target.src;
                img.style.width = "100%";
                viewerContent.appendChild(img);
            } else if (e.target.tagName === "VIDEO") {
                const video = document.createElement("video");
                video.src = e.target.currentSrc;
                video.controls = true;
                video.autoplay = true;
                video.style.width = "100%";
                viewerContent.appendChild(video);
            }
        }
    });

    // Close when clicking X
    viewerCloseBtn.onclick = function() {
        viewerModal.style.display = "none";
        viewerContent.innerHTML = "";
    };

    // Close when clicking outside
    window.onclick = function(event) {
        if (event.target === viewerModal) {
            viewerModal.style.display = "none";
            viewerContent.innerHTML = "";
        }
    };

});
