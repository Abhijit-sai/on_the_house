import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8">
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
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
