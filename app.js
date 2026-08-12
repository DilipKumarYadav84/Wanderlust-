if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const mongoose = require('mongoose');
const path = require('path');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const ExpressError = require('./utils/EpressError.js');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user.js');

const Review = require('./models/review.js');
const MONGO_URL = 'mongodb://127.0.0.1:27017/wanderlust';

const listingRouter = require('./routes/listing.js');
const reviewRouter = require('./routes/reviews.js');
const userRouter = require('./routes/user.js');


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


const sessionOptions = {
    secret: 'mySupersecret!',
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
    },
};
app.get('/', (req, res) => {
    res.send('Hey I am root page');
});

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currentUser = req.user;
    next();
});

// app.get("/demouser", async (req, res) => {
//     let fakeUser = new User({ 
//         email: "student@gmail.com",
//         username: "student",
//     });
//     let newUser = await User.register(fakeUser, "helloworld");
//     res.send(newUser);
       
// });

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

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);


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
