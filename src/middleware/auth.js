const express = require('express')
const router = express.Router()
const passport = require('passport')
const FacebookStrategy = require('passport-facebook').Strategy
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy

const get = require('lodash/get')
const ms = require('..')
const { config, model } = ms
const { Credential } = model
const { newUser } = require('../notification')
confValues = config.get()

const webUrl =
  confValues.web.url ||
  'http://localhost' + (confValues.web.port ? `:${confValues.web.port}` : '')

const url =
  (config.get('url') || 'http://localhost') +
  (config.get('port') ? `:${config.get('port')}` : '')

passport.serializeUser(function(user, done) {
  done(null, user._id)
})

passport.deserializeUser(function(_id, done) {
  Credential.find({ _id })
    .exec()
    .then(user => {
      done(null, user)
    })
})

const createUser = ({ _id, avatar, firstName, lastName }, done) => {
  Credential.findOne({ _id })
    .exec()
    .then(user => {
      if (user) return done(null, user)

      return new Credential({
        _id,
        hash: Math.random().toString(),
        salt: Math.random().toString()
      })
        .save()
        .then(user => {
          newUser({ _id, avatar, firstName, lastName }).then(_id => {
            done(null, user)
          })
        })
    })
}

// Facebook Strategy

passport.use(
  new FacebookStrategy(
    {
      clientID: config.get('facebook.clientId'),
      clientSecret: config.get('facebook.clientSecret'),
      callbackURL: `${url}/auth/facebook/callback`,
      profileFields: ['id', 'emails', 'name']
    },
    function(accessToken, refreshToken, profile, done) {
      console.log(profile)
      createUser(
        {
          _id: get(profile, '_json.email'),
          firstName: get(profile, '_json.first_name'),
          lastName: get(profile, '_json.last_name')
        },
        done
      )
    }
  )
)

router.get('/auth/facebook', passport.authenticate('facebook'))
router.get(
  '/auth/facebook/callback',
  passport.authenticate('facebook'),
  (req, res) => {
    var token = ms.sign({ user: { _id: req.user._id } })

    res.redirect(`${webUrl}?token=${token}`)
  }
)

// Google Strategy

passport.use(
  new GoogleStrategy(
    {
      clientID: config.get('google.clientId'),
      clientSecret: config.get('google.clientSecret'),
      callbackURL: `${url}/auth/google/callback`,
      profileFields: ['id', 'email', 'name']
    },
    function(accessToken, refreshToken, profile, done) {
      createUser(
        {
          _id: `${profile.id}@gmail.com`,
          firstName: get(profile, 'name.givenName'),
          lastName: get(profile, 'name.familyName'),
          avatar: get(profile, 'photos.0.value')
        },
        done
      )
    }
  )
)

router.get(
  '/auth/google',
  passport.authenticate('google', {
    scope: ['https://www.googleapis.com/auth/plus.login']
  })
)
router.get(
  '/auth/google/callback',
  passport.authenticate('google'),
  (req, res) => {
    var token = ms.sign({ user: { _id: req.user._id } })

    res.redirect(`${webUrl}?token=${token}`)
  }
)

module.exports = [passport.initialize(), passport.session(), router]
