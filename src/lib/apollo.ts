// lib/apollo.ts
import { ApolloClient, InMemoryCache } from "@apollo/client"

const client = new ApolloClient({
  uri: process.env.NEXT_PUBLIC_SUBGRAPH_URL, // <-- ganti dengan URL subgraph kamu
  cache: new InMemoryCache(),
})

export default client
