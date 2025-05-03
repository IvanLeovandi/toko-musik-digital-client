import Image from 'next/image'
import React from 'react'

import imagePlaceholder from '@/assets/card-image-placeholder.webp'
import Link from 'next/link'

const SongCard = ({
  productId,
}: {
  productId: number,
}) => {
  return (
    <div>
      <Link href={`/song/${productId}`} className="card border border-base-300 bg-base-100 w-96 shadow-sm">
        <figure>
          <Image
            src={imagePlaceholder}
            alt="Shoes"
            width={400}
            height={400}
          />
        </figure>
        <div className="card-body">
          <h2 className="card-title">
            Card Title
            <div className="badge badge-secondary">NEW</div>
          </h2>
          <p>A card component has a figure, a body part, and inside body there are title and actions parts</p>
          <div className="card-actions justify-end">
            <div className="badge badge-outline">Fashion</div>
            <div className="badge badge-outline">Products</div>
          </div>
        </div>
      </Link>
    </div>
  )
}

export default SongCard