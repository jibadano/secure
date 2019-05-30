const { gql, AuthenticationError } = require('apollo-server')
const jsonwebtoken = require('jsonwebtoken')
const get = require('lodash/get')
const { config, model } = require('../microservice')
const crypto = require('crypto')
const { Credential } = model

const typeDefs = gql`

  extend type Query {
    me: Session
    exists(_id:ID): Boolean
  }

  extend type Mutation {
    login(_id: ID, password:String): Session
    signup(_id: ID!, password: String!): Session
    forgot(_id: ID!): Boolean
    updateUser(_id: ID, password: String): Boolean
    deleteUser(_id: ID): Boolean
  }

  type User {
    _id: ID!
  }

  type Session {
    user: User
    token: String
  }
`

const resolvers = {
  Query: {
    me: (_, __, context) => {
      const user = get(context, 'session.user')
      return user && { user, token: sign(user) }
    },
    exists: (_, args) => Credential.findOne(args).select('_id').exec().then(cred => Boolean(cred))
  },
  Mutation: {
    login: async (_, { _id, password }) => {
      const user = await Credential.findOne({ _id }).exec()
      user.password = password
      if (!validateCredential(user)) return new AuthenticationError("Email or password is invalid")
      return { user, token: sign(user) }
    },
    signup: async (_, args) => {
      let user = await new Credential(generateCredential(args)).save()
      if (!user) return null
      return { user, token: sign(user) }
    },
    forgot: (_, args) => { console.log(args) },
    updateUser: (_, { _id, ...update }) => Credential.updateOne({ _id }, update).exec(),
    deleteUser: (_, args) => Credential.deleteOne(args).exec(),
  }
}

const sign = user => jsonwebtoken.sign({ user }, config.get('jwt.options.secret'), config.get('jwt.signOptions'))

const validateCredential = ({ password, hash, salt }) => hash == crypto.createHash(config.get("security.algorithm")).update(password + salt).digest('hex')

const generateCredential = ({ _id, password }) => {
  const salt = crypto.randomBytes(config.get("security.saltBytes")).toString()
  const hash = crypto.createHash(config.get("security.algorithm")).update(password + salt).digest('hex')
  return { _id, hash, salt }
}

module.exports = { typeDefs, resolvers }