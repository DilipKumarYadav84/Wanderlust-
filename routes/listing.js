const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync.js');
const { listingSchema } = require('../schema.js');
const ExpressError = require('../utils/EpressError.js');
const Listing = require('../models/listing.js');
const { isLoggedIn } = require('../middleware.js');



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

//schema validation middleware
const validateListing = (req, res, next) => {
    let { error}= listingSchema.validate(req.body);
     if (error) {
    let errMsg = error.details.map(el => el.message).join(",");
      throw new ExpressError(400, errMsg);
  }else{
  next();
}
};

//Index route to display all listings
router.get('/', wrapAsync(async(req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index", { listings: allListings });
}));
// new Route to display a form for creating a new listing
router.get('/new', isLoggedIn, (req, res)=>{
    
    res.render("listings/new.ejs");

})


// Show route to display a single listing
router.get('/:id', wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate('reviews').populate("owner");
    if (!listing) {
        req.flash("error", "Listing you are looking for does not exist!");
        return res.redirect('/listings');
    }
    console.log(listing);
    res.render("listings/show.ejs", { listing });
}));

// Create route to add a new listing to the database
router.post('/',isLoggedIn, wrapAsync(async (req, res, next) => {
   // let{ title, description, image, price, location, country } = req.body;
    const newListing = new Listing({
        ...normalizeListingInput(req.body),
        owner: req.user._id,
    });
  await newListing.save();
  req.flash("success", "Successfully created a new listing!");
  res.redirect(`/listings`);
    
}));

// Edit route to display a form for editing an existing listing
router.get('/:id/edit',isLoggedIn, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you are looking for does not exist!");
        return res.redirect('/listings');
    }
    res.render("listings/edit.ejs", { listing });
}));

// Update route to update an existing listing in the database
router.put('/:id',isLoggedIn, validateListing, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findByIdAndUpdate(id, normalizeListingInput(req.body), { new: true });
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    req.flash("success", "Listing updated!");
    res.redirect(`/listings/${id}`);
}));

// Delete route to delete an existing listing from the database
router.delete('/:id',isLoggedIn, wrapAsync(async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "Listing deleted!");
    res.redirect('/listings');
}));

module.exports = router;