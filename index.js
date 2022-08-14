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

let exSchema = new mongoose.Schema({
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String,
})

let userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  log: [exSchema],
  count: { type: Number },
})

let User = mongoose.model('User', userSchema)
let Exercise = mongoose.model('Exercise', exSchema)

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params
  const { description, duration, date } = req.body

  let exercise = new Exercise({
    description,
    duration,
    date: getDate(date),
  })

  await exercise.save()

  const data = await User.findByIdAndUpdate(
    _id,
    { $push: { log: exercise } },
    { new: true }
  )

  let result = {}
  result['_id'] = data._id
  result['username'] = data.username
  result['date'] = exercise.date
  result['duration'] = exercise.duration
  result['description'] = exercise.description

  res.json(result)
})

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params
  User.findById(_id).then((result) => {
    let resObj = result

    if (req.query.from || req.query.to) {
      let fromDate = new Date(0)
      let toDate = new Date()

      if (req.query.from) {
        fromDate = new Date(req.query.from)
      }

      if (req.query.to) {
        toDate = new Date(req.query.to)
      }

      fromDate = fromDate.getTime()
      toDate = toDate.getTime()

      resObj.log = resObj.log.filter((session) => {
        let sessionDate = new Date(session.date).getTime()
        return sessionDate >= fromDate && sessionDate <= toDate
      })
    }
    if (req.query.limit) {
      resObj.log = resObj.log.slice(0, req.query.limit)
    }
    resObj['count'] = result.log.length
    res.json(resObj)
  })
})

app.get('/api/users', async (req, res) => {
  const users = await User.find()

  res.json(users)
})

app.post('/api/users', async (req, res) => {
  const { username } = req.body
  let user = await User.findOne({ username })
  if (!user) {
    user = new User({ username })
    await user.save()
    res.json(user)
  } else {
    res.json({ error: 'This user already exists.' })
  }
})

const getDate = (date) => {
  if (!date) {
    return new Date().toDateString()
  }
  const correctDate = new Date()
  const dateString = date.split('-')
  correctDate.setFullYear(dateString[0])
  correctDate.setDate(dateString[2])
  correctDate.setMonth(dateString[1] - 1)

  return correctDate.toDateString()
}

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
