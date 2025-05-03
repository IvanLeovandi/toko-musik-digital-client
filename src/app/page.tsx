import Image from 'next/image';

export default function Home() {
  return (
    <>
      <div className="hero bg-base-200 min-h-screen">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold">Hello there</h1>
            <p className="py-6">
              Provident cupiditate voluptatem et in. Quaerat fugiat ut assumenda excepturi exercitationem
              quasi. In deleniti eaque aut repudiandae et a id nisi.
            </p>
            <button className="btn btn-primary">Get Started</button>
            <div className="mask mask-squircle">
              <Image 
                src='https://olive-magnificent-gibbon-58.mypinata.cloud/ipfs/bafkreifxc5kgf26o5twnhec2kxbas6t7ved3jvdlcyvg6yykgum3yzkb6y' 
                alt="NFT Cover" 
                className="w-full"
                width={400}
                height={400}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
