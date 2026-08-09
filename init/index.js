const mongoose = require("mongoose");
const { data } = require("./data");
const Listing = require("../models/listing");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
    .then(() => {
        console.log("Connected to Database");
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    await Listing.deleteMany({});
    const initData = data.map((obj) => ({
        ...obj,
        owner: new mongoose.Types.ObjectId('6a76c90d18068080b6a3950f'),
    }));
    await Listing.insertMany(initData);
    console.log("Database initialized");
};

initDB();