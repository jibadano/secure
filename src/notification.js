const { config } = require('.')
const { gql } = require('apollo-server')
const { ApolloClient, HttpLink, InMemoryCache } = require('apollo-boost')
const notification = config.get('notification.endpoint')
const fetch = require('isomorphic-unfetch')

const client = new ApolloClient({
  link: new HttpLink({
    uri: notification,
    credentials: 'same-origin' // Additional fetch() options like `credentials` or `headers`
  }),
  cache: new InMemoryCache().restore({})
})

const newUser = user =>
  client
    .mutate({
      mutation: gql`
        mutation insertUser(
          $_id: ID!
          $firstName: String
          $lastName: String
          $avatar: String
        ) {
          insertUser(
            _id: $_id
            firstName: $firstName
            lastName: $lastName
            avatar: $avatar
          ) {
            _id
          }
        }
      `,
      variables: user
    })
    .then(({ data }) => data.insertUser)
    .catch(error => console.error(error))

module.exports = {
  newUser
}
