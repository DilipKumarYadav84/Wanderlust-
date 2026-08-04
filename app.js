const express = require('express');
const app = express();
const mongoose = require('mongoose');
const Listing = require('./models/listing.js');
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const wrapAsync = require('./utils/wrapAsync.js');
const ExpressError = require('./utils/EpressError.js');
const { listingSchema, reviewSchema } = require('./schema.js');
const Review = require('./models/review.js');
const MONGO_URL = 'mongodb://127.0.0.1:27017/wanderlust';

main().then(()=>{
    console.log('Connected to Database');
}).catch((err)=>{
    console.log(err);
})

async function main(){
    await mongoose.connect(MONGO_URL);
}
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, 'public')));

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

function normalizeReviewInput(body) {
    return { ...(body.review || body) };
}

app.get('/', (req, res) => {
    res.send('Hey I am root page');
});

// schema validation middleware
const validateListing = (req, res, next) => {
    let { error}= listingSchema.validate(req.body);
     if (error) {
    let errMsg = error.details.map(el => el.message).join(",");
      throw new ExpressError(400, errMsg);
  }else{
  next();
}
};
// schema validation middleware for reviews
const validateReview = (req, res, next) => {
        const review = normalizeReviewInput(req.body);
        let { error}= reviewSchema.validate({ review });
     if (error) {
    let errMsg = error.details.map(el => el.message).join(",");
      throw new ExpressError(400, errMsg);
  }else{
    req.body.review = review;
  next();
}
};

//Index route to display all listings
app.get('/listings', wrapAsync(async(req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index", { listings: allListings });
}));
// new Route to display a form for creating a new listing
app.get('/listings/new', (req, res)=>{
    res.render("listings/new.ejs");

})


// Show route to display a single listing
app.get('/listings/:id', wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate('reviews');
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    res.render("listings/show.ejs", { listing });
}));

// Create route to add a new listing to the database
app.post('/listings', wrapAsync(async (req, res, next) => {
   // let{ title, description, image, price, location, country } = req.body;
  const newListing = new Listing(normalizeListingInput(req.body));
  await newListing.save();
  res.redirect(`/listings`);
    
}));

// Edit route to display a form for editing an existing listing
app.get('/listings/:id/edit', wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    res.render("listings/edit.ejs", { listing });
}));

// Update route to update an existing listing in the database
app.put('/listings/:id', validateListing, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findByIdAndUpdate(id, normalizeListingInput(req.body), { new: true });
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    res.redirect(`/listings/${id}`);
}));

// Delete route to delete an existing listing from the database
app.delete('/listings/:id', wrapAsync(async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    if (!deletedListing) {
        throw new ExpressError(404, "Listing not found");
    }
    res.redirect('/listings');
}));

// Add a review post route to add a review to a listing
app.post('/listings/:id/reviews', validateReview, wrapAsync(async (req, res) => {
   let listing = await Listing.findById(req.params.id);
    if (!listing) {
     throw new ExpressError(404, "Listing not found");
    }
    let newReview = new Review(req.body.review);
   listing.reviews.push(newReview);
   await newReview.save();
   await listing.save();
   res.redirect(`/listings/${listing._id}`);
})
);

// Delete a review route to delete a review from a listing
app.delete('/listings/:id/reviews/:reviewId', wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    
    res.redirect(`/listings/${id}`);
}));



// app.get("/testlistings", ashttp://localhost:8080/listings/6a528c47e061300e114449ceync (req, res) => {
//     let sampleListing = new Listing({
//         title: "My New Villa",
//         description: "This is a sample listing.",
//         image: {
//             filename: "listingimage",
//             url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
//         },
//         price: 1000,
//         location: "Delhi",
//         country: "India",
//     });

//     await sampleListing.save();

//     res.send("Listing Saved");
// });

app.use((req, res, next) => {
    next(new ExpressError(404, "Page not found"));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong" } = err;
    res.status(statusCode).render("error.ejs", { err });
    //res.status(statusCode).send(message);
});


app.listen(8080, ()=>{
    console.log('Server is running on port 8080');
});
