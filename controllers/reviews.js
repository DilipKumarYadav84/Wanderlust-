const Listing = require("../models/listing");
const Review = require("../models/review");
module.exports.createReview=async (req, res) => {
   let listing = await Listing.findById(req.params.id);
   if (!listing) {
      req.flash("error", "Listing you are looking for does not exist!");
      return res.redirect("/listings");
   }
   let newReview = new Review(req.body.review);
   newReview.author = req.user._id;
   listing.reviews.push(newReview);
   await newReview.save();
   await listing.save();
   req.flash("success", "Review added!");
   res.redirect(`/listings/${listing._id}`);
};

module.exports.destroyReview=async (req, res) => {
    let { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    const deletedReview = await Review.findByIdAndDelete(reviewId);
    if (!deletedReview) {
        req.flash("error", "Review you are looking for does not exist!");
        return res.redirect(`/listings/${id}`);
    }
    req.flash("success", "Review deleted!");
    
    res.redirect(`/listings/${id}`);
};
