const {
    expressCspHeader,
    INLINE,
    NONE,
    SELF
} = require("express-csp-header");
require("dotenv").config(); //for env vars
const express = require("express");
//const expressLayouts = require('express-ejs-layouts');
const mongoose = require("mongoose");
const app = express();
//const flash = require('connect-flash');
const session = require("express-session");
const passport = require("passport");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const cors = require("cors");
const path = require("path");
const csp_header_dict = require("./config/csp-headers");
//Passport config
require("./config/passport-google")(passport);
//passport is for authenticating only
//flash message is a message stored in a session and displayed after a redirect of some sort

//DB Config
const db = require("./config/keys").MongoURI;
//Connect to mongo
mongoose
    .connect(db, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("MongoDB connected", process.env.Mongo_URI))
    .catch((err) => console.log(err.message));
//EJS
//app.use(expressLayouts);
//app.set('view engine', 'ejs');
//Bodyparser
app.use(
    express.urlencoded({
        extended: true,
    })
);
const {
    cloudinaryConfig
} = require('./config/cloudinary_support')

app.use(bodyParser.json());

app.use(cors());
app.use(
    expressCspHeader({
        directives: {
            "default-src": [
                ...csp_header_dict.defaultSrc,
                SELF,
                INLINE,
            ],
            "script-src": [
                ...csp_header_dict.scriptSrc,
                SELF,
                INLINE,
            ],
            "img-src": [
                ...csp_header_dict.imgSrc,
                SELF,
                INLINE,
            ],
        },
    })
);
//Express session
// app.use(
//     session({
//         secret: "keyboard cat",
//         resave: false,
//         saveUninitialized: false,
//     })
// );
//when user is authenticated its serialised to cookies and then attached to req.user(as well as req.session.passport.user)
//on subsequent requests, passport.initialize() middleware is called.
//It finds the passport.user attached to the session, if it doesnt(user yet not authenticated) it creates it like req.passport.user={}
//passport.initialize middleware is invoked on every request. It ensures the session contains a passport.user object, which may be empty
app.use(passport.initialize());

//next passport.session() is invoked. If it finds a serialised user object in the session, it considers the request to be authenticated.
//it then calls the passport.deserializeUser whule attaching the loaded user ibject to req as req.user()
//passport.session middleware is a Passport Strategy which will load the user object onto req.user if a serialised user object was found in the server.
//passport.deserializeUser is invoked on every request by passport.session. It enables us to load additional user information on every request. This user object is attached to the request as req.user making it accessible in our request handling.
//
// app.use(passport.session());
//Connect flash
// app.use(flash());

// //Global vars
// app.use(function (req, res, next) {
//     res.locals.success_msg = req.flash('success_msg');
//     res.locals.error_msg = req.flash('error_msg');
//     res.locals.error_msg = req.flash('error')
//     next();
// });
// app.use((req, res, next) => [
//     res.setHeader("default-src 'self'; script-src 'report-sample' 'self' https://apis.google.com/js/api.js https://kit.fontawesome.com/5a3d56a40e.js; style-src 'report-sample' 'self' https://fonts.googleapis.com https://kit-free.fontawesome.com; object-src 'none'; base-uri 'self'; connect-src 'self'; font-src 'self' https://fonts.gstatic.com https://kit-free.fontawesome.com; frame-src 'self' https://accounts.google.com; img-src 'self'; manifest-src 'self'; media-src 'self'; report-uri https://5f4b9f5fb641482c3e7cfaaa.endpoint.csper.io/; worker-src 'self';")
// ])
app.use(cloudinaryConfig)
app.use("/public", express.static("public"));

//Routes
app.use("/api/menu", require("./routes/api_menu"));
//app.use("/api/dish", require("./routes/api_dish")); no use as all the dishes are inside the Menu
app.use("/api/profile", require("./routes/api_profile"));
app.use("/api/cart", require("./routes/api_cart"));
app.use("/api/order", require("./routes/api_order"));
app.use("/api/cafe", require("./routes/api_cafe"));
if (process.env.NODE_ENV === "production") {
    // Set static folder
    app.use(express.static("gsuser/build"));

    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "gsuser", "build", "index.html"));
    });
}
app.get("/404", function(req, res, next) {
    // trigger a 404 since no other middleware
    // will match /404 after this one, and we're not
    // responding here
    next();
});

app.get("/403", function(req, res, next) {
    // trigger a 403 error
    var err = new Error("not allowed!");
    err.status = 403;
    next(err);
});

app.get("/500", function(req, res, next) {
    // trigger a generic (500) error
    next(new Error("keyboard cat!"));
});

// Error handlers

// Since this is the last non-error-handling
// middleware use()d, we assume 404, as nothing else
// responded.

// $ curl http://localhost:3000/notfound
// $ curl http://localhost:3000/notfound -H "Accept: application/json"
// $ curl http://localhost:3000/notfound -H "Accept: text/plain"

app.use(function(req, res, next) {
    res.status(404).json({
        message: "Requested route not found",
    });
});

// error-handling middleware, take the same form
// as regular middleware, however they require an
// arity of 4, aka the signature (err, req, res, next).
// when connect has an error, it will invoke ONLY error-handling
// middleware.

// If we were to next() here any remaining non-error-handling
// middleware would then be executed, or if we next(err) to
// continue passing the error, only error-handling middleware
// would remain being executed, however here
// we simply respond with an error page.

// app.use(function(err, req, res, next) {
//     // we may use properties of the error object
//     // here and next(err) appropriately, or if
//     // we possibly recovered from the error, simply next().
//     res.status(err.status || 500).json({
//         error: err.message
//     });
// });
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server started on ${PORT}`);
});