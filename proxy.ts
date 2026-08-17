import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/app(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // Keep sign-in on our own domain instead of Clerk's hosted account portal,
    // and come back to whatever the visitor was trying to open.
    await auth.protect({
      unauthenticatedUrl: new URL(
        `/sign-in?redirect_url=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`,
        req.url,
      ).toString(),
    });
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
