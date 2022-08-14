const express = require('express')
const cors = require('cors')
require('dotenv').config()
const { uuid } = require('uuidv4')
const bodyParser = require('body-parser')
const app = express()

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

let Users = []
let Exercise = []
let Logs = []
let Log = []
let count = 0

app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params
  const { description, duration, date } = req.body
  const user = Users.find((e) => e._id === _id)

  const newDate = new Date(date)
  const resp = {
    username: user.username,
    date: newDate.toDateString(),
    description,
    duration: +duration,
    _id: user._id,
  }
  Exercise.push(resp)

  Log.push({
    description,
    duration: +duration,
    date: newDate.toDateString(),
  })
  count++

  res.json(resp)
})

app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params

  const ex = Users.find((e) => e._id === _id)

  const resp = {
    username: ex.username,
    count: count,
    _id: ex._id,
    log: Log,
  }

  Logs.push(resp)

  res.json(resp)
})

app.get('/api/users', (req, res) => {
  const resp = Users

  res.json(resp)
})

app.post('/api/users', (req, res) => {
  let uuId = uuid()
  const id = uuId.replaceAll('-', '').slice(0, 24)

  const { username } = req.body

  const resp = { username, _id: id }
  Users.push(resp)
  res.json(resp)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
