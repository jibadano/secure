const Microservice = require('../microservice')

module.exports = new Microservice(process.env.CONFIG_URL)