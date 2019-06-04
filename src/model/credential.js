const { Schema } = require('mongoose')
const { config } = require('..')

module.exports = new Schema({
  _id: String,
  hash: String,
  salt: { type: String, max: config.get("security.saltBytes") }
})
