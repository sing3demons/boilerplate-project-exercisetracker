const express = require('express')
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const app = express()

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

const exerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: String,
  userId: String,
})

const userSchema = new mongoose.Schema({
  username: String,
})

let Exercise = mongoose.model('Exercise', exerciseSchema)
let User = mongoose.model('User', userSchema)

let count = 0

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params
  const { description, duration, date } = req.body

  let currDate = ''

  if (!date) {
    currDate = new Date(Date.now())

    let myUser = await User.find({ _id })

    let newExercise = new Exercise({
      username: myUser[0]._doc.username,
      description: description,
      duration: duration,
      date: currDate.toISOString(),
      userId: myUser[0]._doc._id,
    })

    await Exercise.create(newExercise)

    res.json({
      username: myUser[0]._doc.username,
      description: description,
      duration: parseInt(duration),
      date: currDate.toDateString(),
      _id: myUser[0]._doc._id,
    })
  } else {
    currDate = date

    if (currDate.match(/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]/)) {
      let tempDate = currDate.split('-')
      tempDate = new Date(tempDate[0], tempDate[1] - 1, tempDate[2])

      let myUser = await User.find({ _id: _id })

      let newExercise = new Exercise({
        username: myUser[0]._doc.username,
        description: description,
        duration: duration,
        date: tempDate.toISOString(),
        userId: myUser[0]._doc._id,
      })

      await Exercise.create(newExercise)

      res.json({
        username: myUser[0]._doc.username,
        description: description,
        duration: parseInt(duration),
        date: tempDate.toDateString(),
        _id: myUser[0]._doc._id,
      })
    } else {
      res.json({ error: 'Invalid Date Format' })
    }
  }
})

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params
  const { from, to, limit } = req.query
  let myUser = await User.find({ _id })

  let dateObj = {}
  let fromDate, toDate
  if (from) {
    dateObj['$gte'] = new Date(from).toISOString()
    fromDate = new Date(dateObj['$gte']).toDateString()
  }
  if (to) {
    dateObj['$lte'] = new Date(to).toISOString()
    toDate = new Date(dateObj['$lte']).toDateString()
  }

  let filter = {
    userId: myUser[0]._doc._id,
  }
  if (from || to) {
    filter.date = dateObj
  }

  let myExercise = {}
  if (limit) {
    myExercise = await Exercise.find(filter).limit(parseInt(limit))
  } else {
    myExercise = await Exercise.find(filter)
  }

  let myLog = []
  myExercise.map((d) =>
    myLog.push({
      description: d.description,
      duration: d.duration,
      date: new Date(
        d.date.split('T')[0].split('-')[0],
        d.date.split('T')[0].split('-')[1] - 1,
        d.date.split('T')[0].split('-')[2]
      ).toDateString(),
    })
  )

  res.json({
    username: myUser[0]._doc.username,
    count: myExercise.length,
    _id: myUser[0]._doc._id,
    to: toDate,
    from: fromDate,
    log: myLog,
  })
})

app.get('/api/users', async (req, res) => {
  try {
    const data = await User.find()
    res.json(data)
  } catch (error) {
    console.log(err)
  }
})

app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body
    count++

    let newUser = new User({
      username,
    })

    let myUser = await User.findOne({ username })

    if (!myUser) {
      await User.create(newUser)

      myUser = await User.findOne({ username })

      res.json({
        username,
        _id: myUser._id,
      })
    } else {
      res.json({ error: `User already exists with an Id of ${myUser._id}` })
    }
  } catch (err) {
    console.log(err)
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
