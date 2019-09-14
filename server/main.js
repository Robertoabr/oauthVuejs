const express = require('express');
//knex and objectionjs are for data queries and ORM

// I am not familiar with knex/objection/or View. Your front end I don't need to touch.  So, on the backend I am going to focus on the express and just flag below where the user info comes back and you can link it to the model. I am also going to broadly comment my changes

const Knex = require('knex');
const knexConfig = require('./knexfile');
const { Model } = require('objection');
const cors = require('cors');
const routes = require('express').Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const bodyParser = require('body-parser');
const secrets = require('./config/secrets.json');
const morgan = require('morgan'); // added morgan (logging)

const app = express();

// Added Logging middleware (so I could see what was happening to server) feel free to uninstall
app.use(morgan('dev'));

const port = 3000;

const knex = Knex(knexConfig.development);
Model.knex(knex);

app.use(bodyParser.json());

// Setup Session middleware - to make login persist
const session = require('express-session');
app.use(
  session({
    secret: 'This is not a very secure secret needs update...', // perhaps use environment var
    resave: false,
    saveUninitialized: false
  })
);

// app.use(
//   cors({
//     origin: 'http://localhost:8080'
//   })
// );

// adding oAuth middleware (you need to start up passport after session but before the routes)
app.use(passport.initialize());
app.use(passport.session());

// to simplify this, test it, and make this as transparent as possible , I just created a google test account vs using the below (email testingoauth132@gmail.com ,P@ssword321 )
const oathSecrets = {
  authorizationURL: secrets.web.auth_uri,
  tokenURL: secrets.web.token_uri,
  clientID: secrets.web.client_id,
  clientSecret: secrets.web.client_secret,
  callbackURL: 'http://localhost:3000/auth/google/callback'
};

//I have installed and used the Google specific NPM Passport strategy package as opposed to your multi-vendor package (you could probable use either, but I was familiar with this one so...)
passport.use(
  new GoogleStrategy(
    {
      clientID:
        '155634799162-sqe5o5ouf9osj2uolkk8p1uvcs8l59e2.apps.googleusercontent.com',
      clientSecret: 'azN0I4wJBT9jIoLie5dcxEx4', // defintely never use this again as its on Github!
      callbackURL: 'http://localhost:3000/auth/google/callback'
    },
    // Google will send back the token and profile
    async (token, refreshToken, profile, done) => {
      //logging to make sure this is working each time
      console.log('---', 'in verification callback', profile, '---');

      // the callback will pass back user profile information and each service (Facebook, Twitter, and Google) will pass it back differently. Passport standardizes the output profile object.

      const info = {
        email: profile.emails[0].value,
        imageUrl: profile.photos ? profile.photos[0].value : undefined
      };

      // here I am querying the model with the returned data from google to see if the user exists - you need to import your user model to this file and correct the syntax below to suit your ORM and call done with the right info(http://www.passportjs.org/docs/configure/
      // try {
      //   let [user, bool] = await User.findOrCreate({
      //     where: { googleId: profile.id },
      //     defaults: info
      //   });
      done(null, { id: 2, email: 'ffff@aol.com' }); //   done(null, user);
      // } catch (error) {
      // done();
      // }
    }
  )
);

// Google authentication and login
app.get('/auth/google', passport.authenticate('google', { scope: 'email' }));

// Handles the callback after Google has authenticated the user
app.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    successRedirect: 'http://localhost:8080/home', // not sure what you want done on success?
    failureRedirect: 'http://localhost:8080/login' // or wherever
  })
);

//linking a token from google to passport session
passport.serializeUser((user, done) => {
  // __________
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  // __________
  try {
    let foundUser = await User.findById(id);
    done(null, foundUser);
  } catch (error) {
    done(error);
  }
});

app.get('/just_redirect', (req, res) => {
  res.redirect('http://localhost:8080/');
});

app.use('/', routes);

// app.use(
//   bodyParser.urlencoded({
//     extended: true
//   })
// );

// Added Error handling endware (just to make sure I didn't miss anything)
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send(err.message || 'Internal server error');
});

app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});
