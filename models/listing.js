const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./review.js");

const listingSchema = new Schema({
    title: String,

    description: String,

    image: {
        url: String,
        filename: String,
    },

    price: Number,

    location: String,

    country: String,

    latitude: {
        type: Number,
        default: 28.6139,
    },

    longitude: {
        type: Number,
        default: 77.2090,
    },

    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: "Review",
        },
    ],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    leafletgeo: {
        type: {
            type: String,
            enum: ["Point"],
            required: true,
            default: "Point",
        },
        coordinates: {
            type: [Number],
            required: true,
            default: [77.2090, 28.6139],
        },  
    },
    category: {
        type: String,
        enum: [
            "Trending",
            "Rooms",
            "Iconic Cities",
            "Cities",
            "Mountains",
            "Mountain",
            "Castles",
            "Amazing Pools",
            "Pools",
            "Camping",
            "Farms",
            "farms",
            "Arctic",
            "arctic",
            "Domes",
            "Boats",
        ],
        default: "Trending",
    },
});

listingSchema.post("findOneAndDelete", async(listing) => {
    if(listing){
        await Review.deleteMany({
            _id: {
                $in: listing.reviews,
            },
        });
    }
});

const Listing = mongoose.model("Listing", listingSchema);

module.exports = Listing;
