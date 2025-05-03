'use client'

import { ReactNode } from 'react'
import { ApolloProvider } from '@apollo/client'
import client from '@/lib/apollo'
import { AuthProvider } from '@/context/AuthContext'

type ProvidersProps = {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <ApolloProvider client={client}>
        {children}
      </ApolloProvider>
    </AuthProvider>
  )
}
