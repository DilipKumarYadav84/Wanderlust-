const Listing = require("../models/listing");
const https = require("https");

const CATEGORY_LABELS = [
    "Trending",
    "Rooms",
    "Iconic Cities",
    "Mountains",
    "Castles",
    "Amazing Pools",
    "Camping",
    "Farms",
    "Arctic",
    "Domes",
    "Boats",
];

const CATEGORY_QUERY_FALLBACK = {
    Trending: null,
    Rooms: /room|loft|apartment|penthouse|suite|house/i,
    "Iconic Cities": /city|downtown|tokyo|miami|new york|amsterdam|boston|dubai/i,
    Mountains: /mountain|alps|aspen|banff|ski|cabin|highlands/i,
    Castles: /castle|historic villa|villa|brownstone|chalet/i,
    "Amazing Pools": /pool|beachfront|infinity/i,
    Camping: /camp|treehouse|cabin|retreat|lodge/i,
    Farms: /farm|cottage|rustic|ranch/i,
    Arctic: /arctic|snow|ice|igloo|ski/i,
    Domes: /dome|igloo/i,
    Boats: /boat|sail|yacht|canal/i,
};

const CATEGORY_DB_ALIASES = {
    Trending: ["Trending"],
    Rooms: ["Rooms"],
    "Iconic Cities": ["Iconic Cities", "Cities"],
    Mountains: ["Mountains", "Mountain"],
    Castles: ["Castles"],
    "Amazing Pools": ["Amazing Pools", "Pools"],
    Camping: ["Camping"],
    Farms: ["Farms", "farms"],
    Arctic: ["Arctic", "arctic"],
    Domes: ["Domes"],
    Boats: ["Boats"],
};

const DELHI_COORDINATES = {
    latitude: 28.6139,
    longitude: 77.2090,
};

function buildCoordinateFields(latitude, longitude) {
    return {
        latitude,
        longitude,
        leafletgeo: {
            type: "Point",
            coordinates: [longitude, latitude],
        },
    };
}

function normalizeListingInput(body) {
    const listing = { ...(body.listing || body) };

    if (typeof listing.image === "string") {
        listing.image = {
            filename: "listingimage",
            url: listing.image,
        };
    }

    delete listing.latitude;
    delete listing.longitude;
    delete listing.leafletgeo;

    return listing;
}

function isValidLatitudeLongitude(latitude, longitude) {
    return (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
}

function getValidListingCoordinates(listing) {
    const geoCoordinates =
        listing.leafletgeo &&
        listing.leafletgeo.type === "Point" &&
        Array.isArray(listing.leafletgeo.coordinates)
            ? listing.leafletgeo.coordinates.map(Number)
            : null;

    if (geoCoordinates && geoCoordinates.length === 2) {
        const [longitude, latitude] = geoCoordinates;
        if (isValidLatitudeLongitude(latitude, longitude)) {
            return buildCoordinateFields(latitude, longitude);
        }
    }

    const latitude = Number(listing.latitude);
    const longitude = Number(listing.longitude);

    if (isValidLatitudeLongitude(latitude, longitude)) {
        return buildCoordinateFields(latitude, longitude);
    }

    return null;
}

function hasValidLeafletGeo(listing) {
    return Boolean(
        listing.leafletgeo &&
            listing.leafletgeo.type === "Point" &&
            Array.isArray(listing.leafletgeo.coordinates) &&
            listing.leafletgeo.coordinates.length === 2 &&
            isValidLatitudeLongitude(
                Number(listing.leafletgeo.coordinates[1]),
                Number(listing.leafletgeo.coordinates[0])
            )
    );
}

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        https
            .get(
                url,
                {
                    headers: {
                        "User-Agent": "Wanderlust/1.0 (Leaflet OpenStreetMap geocoding)",
                    },
                },
                (response) => {
                    let data = "";

                    response.on("data", (chunk) => {
                        data += chunk;
                    });

                    response.on("end", () => {
                        if (response.statusCode < 200 || response.statusCode >= 300) {
                            return reject(new Error(`Location lookup failed with status ${response.statusCode}`));
                        }

                        try {
                            resolve(JSON.parse(data));
                        } catch (error) {
                            reject(error);
                        }
                    });
                }
            )
            .on("error", reject);
    });
}

function escapeRegex(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeCategoryInput(category) {
    if (!category || typeof category !== "string") {
        return "";
    }

    const normalizedInput = category.trim().toLowerCase();
    return CATEGORY_LABELS.find((label) => label.toLowerCase() === normalizedInput) || "";
}

function buildCategoryFilter(categoryLabel) {
    const aliases = CATEGORY_DB_ALIASES[categoryLabel] || [];
    const dbMatchers = aliases.map((value) => ({
        category: { $regex: `^${escapeRegex(value)}$`, $options: "i" },
    }));
    const fallbackRegex = CATEGORY_QUERY_FALLBACK[categoryLabel];

    if (!fallbackRegex || categoryLabel === "Trending") {
        return dbMatchers.length ? { $or: dbMatchers } : null;
    }

    return {
        $or: [
            ...dbMatchers,
            { title: fallbackRegex },
            { description: fallbackRegex },
            { location: fallbackRegex },
            { country: fallbackRegex },
        ],
    };
}

async function getCoordinatesForLocation(listingInput) {
    if (!listingInput.location && !listingInput.country) {
        return buildCoordinateFields(DELHI_COORDINATES.latitude, DELHI_COORDINATES.longitude);
    }

    const query = [listingInput.location, listingInput.country].filter(Boolean).join(", ");
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    try {
        const results = await fetchJSON(url);
        const firstResult = Array.isArray(results) ? results[0] : null;
        const latitude = Number(firstResult && firstResult.lat);
        const longitude = Number(firstResult && firstResult.lon);

        if (isValidLatitudeLongitude(latitude, longitude)) {
            return buildCoordinateFields(latitude, longitude);
        }
    } catch (error) {
        console.error("Location lookup failed:", error.message);
    }

    return buildCoordinateFields(DELHI_COORDINATES.latitude, DELHI_COORDINATES.longitude);
}

module.exports.index = async (req, res) => {
    const rawSearch = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const selectedCategory = normalizeCategoryInput(req.query.category);
    const andFilters = [];

    if (rawSearch) {
        const safeSearchRegex = new RegExp(escapeRegex(rawSearch), "i");
        andFilters.push({
            $or: [
                { title: safeSearchRegex },
                { location: safeSearchRegex },
                { country: safeSearchRegex },
                { description: safeSearchRegex },
                { category: safeSearchRegex },
            ],
        });
    }

    if (selectedCategory && selectedCategory !== "Trending") {
        const categoryFilter = buildCategoryFilter(selectedCategory);
        if (categoryFilter) {
            andFilters.push(categoryFilter);
        }
    }

    const mongoFilter = andFilters.length ? { $and: andFilters } : {};
    const allListings = await Listing.find(mongoFilter);

    res.render("listings/index", {
        listings: allListings,
        searchQuery: rawSearch,
        selectedCategory,
        categoryLabels: CATEGORY_LABELS,
    });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({ path: "reviews", populate: { path: "author" } })
        .populate("owner");
    if (!listing) {
        req.flash("error", "Listing you are looking for does not exist!");
        return res.redirect('/listings');
    }
    const coordinates = getValidListingCoordinates(listing);
    if (!coordinates) {
        Object.assign(listing, buildCoordinateFields(DELHI_COORDINATES.latitude, DELHI_COORDINATES.longitude));
        await listing.save();
    } else if (!hasValidLeafletGeo(listing)) {
        Object.assign(listing, coordinates);
        await listing.save();
    }
    res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res) => {
    const listingInput = normalizeListingInput(req.body);
    const coordinateFields = await getCoordinatesForLocation(listingInput);
    const newListing = new Listing({
        ...listingInput,
        ...coordinateFields,
        owner: req.user._id,
    });
    if (req.file) {
        let url = req.file.path;
        let filename = req.file.filename;
        newListing.image = { url, filename }; // Set the image field with the uploaded file's URL and filename
    }
    await newListing.save();
    req.flash("success", "Successfully created a new listing!");
    res.redirect(`/listings`);
};

module.exports.renderEditForm = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you are looking for does not exist!");
        return res.redirect('/listings');
    }
    let originalImageUrl = listing.image ? listing.image.url : null; // Store the original image URL
    originalImageUrl = originalImageUrl ? originalImageUrl.replace("/upload","/upload/w_300,h_200,c_fill") : null; // Modify the URL to include resizing parameters
    res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    let listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you are looking for does not exist!");
        return res.redirect('/listings');
    }
    const listingInput = normalizeListingInput(req.body);
    const locationChanged =
        listing.location !== listingInput.location ||
        listing.country !== listingInput.country;

    if (locationChanged || !getValidListingCoordinates(listing)) {
        Object.assign(listingInput, await getCoordinatesForLocation(listingInput));
    }

    listing = await Listing.findByIdAndUpdate(id, listingInput, { runValidators: true, new: true });
    
    if (typeof req.file !== "undefined" ) {
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = { url, filename }; // Set the image field with the uploaded file's URL and filename
        await listing.save(); // Save the updated listing with the new image
    }
    req.flash("success", "Listing updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing deleted!");
    res.redirect('/listings');
};
