// Require the express module and create a router
var express = require('express');
var router = express.Router();

// Require user and post models, passport, and the local strategy
const userModel = require('./users');
const postModel = require('./posts');
const passport = require('passport');
const localstrategy = require('passport-local');
const upload = require('./multer');

// Configure passport to use the local strategy with the user model's authenticate method
passport.use(new localstrategy(userModel.authenticate()));

// Define a route for the root path ('/')
router.get('/', function (req, res, next) {
  // Render the 'index' view with a title parameter set to 'Express'
  res.render('index', { title: 'Express' });
});

// Define a route for the '/profile' path, and use the isLoggedIn middleware
router.get("/profile", isLoggedIn,async function (req, res, next) {
  const user = await userModel.findOne({ 
    username: req.session.passport.user })
    .populate("posts");
  // Send the string "profile" as the response
  res.render('profile' , {user});
});

// Define a route for the '/login' path
router.get("/login", function (req, res, next) {
  res.render('login', {error: req.flash("error")});
});

router.get("/feed", function (req, res, next) {
  res.render('feed');
});
router.post("/upload", upload.single("file"),async function (req, res,next) {
  if(!req.file) {
    res.status(404).send("No file uploaded");
  }
  const user = await userModel.findOne({
    username: req.session.passport.user
  })
  const post = await postModel.create({
    image: req.file.filename, 
    imageText : req.body.filecaption,
    user : user._id
  })
  user.posts.push(post._id);
  await user.save();
  res.send("Done");  
});

// Define a route for the '/register' path and handle user registration
router.post("/register", function (req, res) {
  // Extract username, fullName, and email from the request body
  const { username, fullName, email } = req.body;
  
  // Create a new user with the extracted data
  const userData = new userModel({ username, email, fullName });

  // Register the user using the userModel's register method
  userModel.register(userData, req.body.password)
    .then(function () {
      // Authenticate the user after successful registration and redirect to '/profile'
      passport.authenticate("local")(req, res, function () {
        res.redirect("/profile");
      })
    })
});

// Define a route for the '/login' path and handle user authentication
router.post("/login", passport.authenticate("local",
  {
    // Redirect to '/profile' on successful login
    successRedirect: "/profile",
    // Redirect to '/' on failed login
    failureRedirect: "/login",
    failureFlash: true, 
  }),
  function (req, res) {
});

// Define a route for the '/logout' path
router.get("/logout", function (req, res) {
  // Logout the user and redirect to '/'
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/login');
  });
});

// Middleware function to check if the user is authenticated
function isLoggedIn(req, res, next) {
  // If the user is authenticated, proceed to the next middleware or route
  if (req.isAuthenticated()) {
    return next();
  }
  // If not authenticated, redirect to '/'
  res.redirect("/");
}

// Export the router module
module.exports = router;
