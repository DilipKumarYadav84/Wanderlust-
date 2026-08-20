const mapContainer = document.getElementById("map");

function showMapFallback() {
    if (!mapContainer) {
        return;
    }

    mapContainer.hidden = true;
    const message = document.createElement("p");
    message.className = "text-muted";
    message.textContent = "Map location is currently unavailable.";
    mapContainer.insertAdjacentElement("afterend", message);
}

function getValidCoordinates() {
    if (!mapContainer) {
        return null;
    }

    let coordinates;

    try {
        coordinates = JSON.parse(mapContainer.dataset.coordinates);
    } catch (error) {
        return null;
    }

    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        return null;
    }

    const longitude = Number(coordinates[0]);
    const latitude = Number(coordinates[1]);

    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return null;
    }

    return { latitude, longitude };
}

if (mapContainer) {
    const coordinates = getValidCoordinates();

    if (!coordinates || typeof L === "undefined") {
        showMapFallback();
    } else {
        const { latitude, longitude } = coordinates;
        const map = L.map("map").setView([latitude, longitude], 13);

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        const popupContent = document.createElement("span");
        const title = document.createElement("b");
        title.textContent = mapContainer.dataset.title || "Listing";
        popupContent.append(title, document.createElement("br"), "Exact location of this listing.");

        const listingIcon = L.divIcon({
            className: "listing-home-marker",
            html: '<div class="listing-marker-pin"><i class="fa-solid fa-house"></i></div>',
            iconSize: [34, 42],
            iconAnchor: [17, 42],
            popupAnchor: [0, -38],
        });

        L.marker([latitude, longitude], { icon: listingIcon })
            .addTo(map)
            .bindPopup(popupContent)
            .openPopup();
    }
}
