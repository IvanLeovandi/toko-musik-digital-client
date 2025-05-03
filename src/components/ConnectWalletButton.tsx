'use client'

import { useState } from "react"
import useWallet from "@/hooks/useWallet"

export default function ConnectWalletButton ({ email }: { email: string }) {
  const { account, connectWallet, signMessage, error } = useWallet()
  const [signatureVerified, setSignatureVerified] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConnectWallet = async () => {
    try {
      if (!account) {
        await connectWallet()
      }

      if (account) {
        setLoading(true)

        const message = `Login confirmation for Toko Musik Digital: ${account}`
        const signature = await signMessage(message)
        if (!signature) throw new Error("Failed to sign message")

        const res = await fetch("/api/auth/verify-signature", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, address: account, message, signature }),
        })

        if (!res.ok) throw new Error("Failed to verify wallet")

        setSignatureVerified(true)
      }
    } catch (err) {
      console.error("Wallet connect error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {signatureVerified ? (
        <div className="text-green-600 font-semibold">✅ Wallet Verified Successfully!</div>
      ) : (
        <button
          onClick={handleConnectWallet}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? "Verifying..." : account ? "Verify Wallet" : "Connect Wallet Securely"}
        </button>
      )}
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  )
}
