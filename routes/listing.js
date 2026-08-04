const express = require('express');
const router = express.Router();
const wrapAsync = require('../utils/wrapAsync.js');
const { listingSchema } = require('../schema.js');
const ExpressError = require('../utils/EpressError.js');
const Listing = require('../models/listing.js');



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
router.get('/new', (req, res)=>{
    res.render("listings/new.ejs");

})


// Show route to display a single listing
router.get('/:id', wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate('reviews');
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    res.render("listings/show.ejs", { listing });
}));

// Create route to add a new listing to the database
router.post('/', wrapAsync(async (req, res, next) => {
   // let{ title, description, image, price, location, country } = req.body;
  const newListing = new Listing(normalizeListingInput(req.body));
  await newListing.save();
  res.redirect(`/listings`);
    
}));

// Edit route to display a form for editing an existing listing
router.get('/:id/edit', wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    res.render("listings/edit.ejs", { listing });
}));

// Update route to update an existing listing in the database
router.put('/:id', validateListing, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findByIdAndUpdate(id, normalizeListingInput(req.body), { new: true });
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    res.redirect(`/listings/${id}`);
}));

// Delete route to delete an existing listing from the database
router.delete('/:id', wrapAsync(async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    if (!deletedListing) {
        throw new ExpressError(404, "Listing not found");
    }
    res.redirect('/listings');
}));

module.exports = router;