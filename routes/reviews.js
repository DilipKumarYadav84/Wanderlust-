const express = require('express');
const router = express.Router({ mergeParams: true });
const wrapAsync = require('../utils/wrapAsync.js');
const { reviewSchema } = require('../schema.js');
const ExpressError = require('../utils/EpressError.js');
const Listing = require('../models/listing.js');
const Review = require('../models/review.js');
const { validateReview, isLoggedIn, isreviewAuthor } = require('../middleware.js');

// Add a review post route to add a review to a listing
router.post('/',isLoggedIn, validateReview, wrapAsync(async (req, res) => {
   let listing = await Listing.findById(req.params.id);
   let newReview = new Review(req.body.review);
   newReview.author = req.user._id;
   console.log(newReview);
   listing.reviews.push(newReview);
   await newReview.save();
   await listing.save();
   req.flash("success", "Review added!");
   res.redirect(`/listings/${listing._id}`);
})
);

// Delete a review route to delete a review from a listing
router.delete('/:reviewId',isLoggedIn,isreviewAuthor, wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    req.flash("success", "Review deleted!");
    
    res.redirect(`/listings/${id}`);
}));

module.exports = router;