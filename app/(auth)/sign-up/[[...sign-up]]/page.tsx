import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8">
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/app/dashboard"
        appearance={{
          elements: {
            rootBox: "w-full max-w-sm",
            card: "bg-[#121212] border border-[rgba(255,244,214,0.12)] shadow-none",
          },
        }}
      />
    </main>
  );
}
