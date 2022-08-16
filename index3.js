require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
// const fetch = require("node-fetch");

app.use(cors())
app.use(express.static('public'))
const bodyParserUrlEncoded = bodyParser.urlencoded({ extended: false })
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

let mongoose
try {
  mongoose = require('mongoose')
} catch (e) {
  console.log(e)
}
const { assert } = require('chai')
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
const { Schema } = mongoose

// USER
const exerciseUserSchema = new Schema({
  username: { type: String, required: true },
})
let ExerciseUser = mongoose.model('ExerciseUser', exerciseUserSchema)

// ACTIVITY
const exerciseActivitySchema = new Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String, required: true },
})
let ExerciseActivity = mongoose.model(
  'ExerciseActivity',
  exerciseActivitySchema
)

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *                     API routes                            *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

app
  /**
   * GET /api/users
   *
   * Returns a list of all users
   */
  .route('/api/users')
  .get((req, res) => {
    ExerciseUser.find({}, (err, docs) => {
      if (err) {
        console.error(err)
        res.json({ error: err })
      } else {
        res.json(docs)
      }
    })
  })

  /**
   * POST /api/users
   *
   * Creates a new user
   * Request body (URL encoded):
   * - username (String)
   */
  .post(bodyParserUrlEncoded, (req, res) => {
    const { username } = req.body

    // look up if a user with this name already exists ... if so res error
    let promise = ExerciseUser.findOne({ username: username }).exec()
    assert.ok(promise instanceof Promise)
    promise.then((userObject) => {
      if (userObject !== null) {
        // The user exists, so return the object
        res.json({
          username: userObject.username,
          _id: userObject._id,
        })
      } else {
        // The user does not yet exist, so create a new one
        const newUser = new ExerciseUser({ username: username })
        newUser.save((err) => {
          if (err) res.json({ Error: err })
          else
            res.json({
              username: newUser.username,
              _id: newUser._id,
            })
        })
      }
    })
  })

/**
 * GET /api/users/:_id/logs
 *
 * View the activities log for one user
 */
app.get('/api/users/:_id/logs', (req, res) => {
  // get user id from params and check that it won't break the DB query
  const { _id } = req.params
  if (_id.length !== 24) {
    return res.json({ error: 'User ID needs to be 24 hex characters' })
  }

  // find the user
  getUserByIdAnd(_id, (userObject) => {
    if (userObject === null) res.json({ error: 'User not found' })
    else {
      const limit = req.query.limit ? req.query.limit : 0

      // find the user's activities
      let promise = ExerciseActivity.find({ user_id: _id }).exec()
      assert.ok(promise instanceof Promise)
      promise.then((exerciseObjects) => {
        // apply from
        if (req.query.from) {
          const from = new Date(req.query.from)
          exerciseObjects = exerciseObjects.filter(
            (e) => new Date(e.date).getTime() >= from.getTime()
          )
        }
        // apply to
        if (req.query.to) {
          const to = new Date(req.query.to)
          exerciseObjects = exerciseObjects.filter(
            (e) => new Date(e.date).getTime() <= to.getTime()
          )
        }
        // apply limit
        if (req.query.limit)
          exerciseObjects = exerciseObjects.slice(0, req.query.limit)

        // change date to DateString
        exerciseObjects = exerciseObjects.map((e) => ({
          description: e.description,
          duration: e.duration,
          date: new Date(e.date).toDateString(),
        }))

        res.json({
          _id: userObject._id,
          username: userObject.username,
          count: exerciseObjects.length,
          log: exerciseObjects,
        })
      })
    }
  })
})

/**
 * POST /api/users/:_id/exercises
 *
 * Submit a new exercise
 */
app.post('/api/users/:_id/exercises', bodyParserUrlEncoded, (req, res) => {
  const { _id } = req.params
  if (_id.length !== 24) {
    res.json({ error: 'User ID needs to be 24 hex characters' })
    return
  }

  getUserByIdAnd(_id, (userObject) => {
    // handle / validate data
    let { description, duration, date } = req.body
    if (description === '' || duration === '') {
      res.json({ error: 'Please provide a description and duration' })
      return
    }
    duration = parseInt(duration, 10)
    if (isNaN(duration)) {
      res.json({ error: 'Please provide a valid duration number' })
      return
    }
    if (date === '' || date === undefined) date = new Date()
    else date = new Date(date)
    if (!isValidDate(date)) {
      res.json({ error: 'Invalid date.' })
      return
    }

    // Add exercise to DB
    const exercise = new ExerciseActivity({
      user_id: userObject._id,
      description: description,
      duration: duration,
      date: date,
    })
    exercise.save()

    // return user and exercise info as JSON
    res.json({
      _id: userObject._id,
      username: userObject.username,
      description: description,
      duration: duration,
      date: new Date(date).toDateString(),
    })
  })
})

/**
 * GET /api/delete
 *
 * deletes all users and activities
 */
app.get('/api/delete', (req, res) => {
  ExerciseActivity.deleteMany({}, (err) => {
    if (err) console.error(err)
    ExerciseUser.deleteMante({}, (err) => {
      if (err) console.error(err)
      res.json({ status: 'All exercise items deleted' })
    })
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 *                     Utilities                             *
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */
const getUserByIdAnd = (_id, callback) => {
  let promise = ExerciseUser.findOne({ _id: _id }).exec()
  assert.ok(promise instanceof Promise)
  promise.then((userObject) => callback(userObject))
}

const isValidDate = (date) => {
  // https://stackoverflow.com/questions/1353684/detecting-an-invalid-date-date-instance-in-javascript
  if (Object.prototype.toString.call(date) === '[object Date]') {
    if (isNaN(date.getTime())) {
      // d.valueOf() could also work
      return false
    } else {
      return true
    }
  } else {
    return false
  }
}
