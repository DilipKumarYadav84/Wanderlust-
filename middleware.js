const { listingSchema } = require('./schema.js');
const ExpressError = require('./utils/EpressError.js');
const Listing = require('./models/listing.js');
const { reviewSchema } = require('./schema.js');
const Review = require('./models/review.js');
module.exports.isLoggedIn = (req, res, next) => {
    if(!req.isAuthenticated()){
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be signed in to create a new listing!");
        return res.redirect("/login");
    }
    next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
    if(req.session.redirectUrl){
        res.locals.redirectUrl = req.session.redirectUrl;
        delete req.session.redirectUrl;
    }
    next();
};

module.exports.isOwner = async (req, res, next) => {
     let { id } = req.params;
   let listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing you are looking for does not exist!");
        return res.redirect('/listings');
    }
    if(!listing.owner || listing.owner.toString() !== res.locals.currentUser._id.toString()){
        req.flash("error", "You are not the owner of this listing!");
        return res.redirect(`/listings/${id}`);
    }
    next();
};

module.exports.validateListing = (req, res, next) => {
        let { error}= listingSchema.validate(req.body);
         if (error) {
        let errMsg = error.details.map(el => el.message).join(",");
          throw new ExpressError(400, errMsg);
      }else{
      next();
      }
};

module.exports.validateReview = (req, res, next) => {
        const { error } = reviewSchema.validate(req.body);
        if (error) {
            let errMsg = error.details.map(el => el.message).join(",");
            throw new ExpressError(400, errMsg);
        } else {
            next();
        }
};


module.exports.isreviewAuthor = async (req, res, next) => {
     let { reviewId, id } = req.params;
   let review = await Review.findById(reviewId);
    if (!review.author.equals(res.locals.currentUser._id)){
        req.flash("error", "You are not the author of this review!");
        return res.redirect(`/listings/${id}`);
    }
    next();
};
