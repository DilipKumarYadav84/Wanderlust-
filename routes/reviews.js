const express = require('express');
const router = express.Router({ mergeParams: true });
const wrapAsync = require('../utils/wrapAsync.js');
const { validateReview, isLoggedIn, isreviewAuthor } = require('../middleware.js');


const reviewController = require('../controllers/reviews.js');

// Add a review post route to add a review to a listing
router.post('/',isLoggedIn, validateReview, wrapAsync(reviewController.createReview));

// Delete a review route to delete a review from a listing
router.delete('/:reviewId',isLoggedIn,isreviewAuthor, wrapAsync(reviewController.destroyReview));

module.exports = router;
