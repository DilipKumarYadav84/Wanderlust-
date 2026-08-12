const Listing = require("../models/listing");

function normalizeListingInput(body) {
    const listing = { ...(body.listing || body) };

    if (typeof listing.image === "string") {
        listing.image = {
            filename: "listingimage",
            url: listing.image,
        };
    }

    return listing;
}

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index", { listings: allListings });
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
    res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res) => {
    const newListing = new Listing({
        ...normalizeListingInput(req.body),
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
    res.render("listings/edit.ejs", { listing });
};

module.exports.updateListing = async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you are looking for does not exist!");
        return res.redirect('/listings');
    }
    await Listing.findByIdAndUpdate(id, normalizeListingInput(req.body), { runValidators: true });
    req.flash("success", "Listing updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
    let { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing deleted!");
    res.redirect('/listings');
};
