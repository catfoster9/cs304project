document.addEventListener("DOMContentLoaded", () => {

    const floorFilter = document.getElementById("floorFilter");
    const sortRating = document.getElementById("sortRating");
    const roomCards = Array.from(document.querySelectorAll('.room-card'));

    function applyFilters() {
        let selectedFloor = floorFilter.value;
        let sortBy = sortRating.value;

        // Filtering
        roomCards.forEach(card => {
            const roomNum = card.getAttribute('data-roomnum');
            const floor = roomNum.charAt(0);

            if (selectedFloor === 'all' || floor === selectedFloor) {
                card.style.display = "";
            } else {
                card.style.display = "none";
            }
        });

        // Sorting
        let visibleCards = roomCards.filter(card => card.style.display !== "none");

        visibleCards.sort((a, b) => {
            if (sortBy === 'rating') {
                return parseFloat(b.getAttribute('data-rating')) - parseFloat(a.getAttribute('data-rating'));
            } else {
                return parseInt(a.getAttribute('data-roomnum')) - parseInt(b.getAttribute('data-roomnum'));
            }
        });

        // Reorder cards in the DOM
        const grid = document.querySelector('.grid-container');
        visibleCards.forEach(card => grid.appendChild(card));
    }

    floorFilter.addEventListener('change', applyFilters);
    sortRating.addEventListener('change', applyFilters);
});
