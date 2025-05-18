import React from 'react'

interface AuthUser {
  id: string
  email: string
  walletAddress?: string
  role: Role
}

type Role = 'USER' | 'ADMIN'

const WalletChangeWarning = ({
  walletMismatch,
  dbSyncFailed,
  showConnectWallet,
  user,
  connectWallet,
  retryRemoveWalletFromDB,
}: {
  walletMismatch: boolean
  dbSyncFailed: boolean
  showConnectWallet: boolean
  user: AuthUser | null
  connectWallet: () => void
  retryRemoveWalletFromDB: () => void
}) => {
  return (
    <div>
      {walletMismatch && (
        <div className="alert alert-error mb-6">
          <span>⚠️ Wallet mismatch detected. Please connect your registered wallet: <strong>{user?.walletAddress}</strong></span>
        </div>
      )}

      {dbSyncFailed && (
        <div className="alert alert-error mb-6 justify-between items-center">
          <span>⚠️ Failed to sync wallet disconnect to the server.</span>
          <button onClick={retryRemoveWalletFromDB} className="btn btn-sm btn-outline">Retry Sync</button>
        </div>
      )}

      {showConnectWallet && (
        <div className="alert alert-warning mb-6">
          <span>🚨 Wallet not connected. Please connect your wallet to access NFT features.</span>
          <button className="btn btn-sm btn-primary ml-auto" onClick={connectWallet}>
            Connect Wallet
          </button>
        </div>
      )}
    </div>
  )
}

export default WalletChangeWarning