import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login', // Error code passed in query string as ?error=
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const res = await fetch(`${backendUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password,
          }),
        });
        if (!res.ok) return null;
        const user = await res.json();
        return user;
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account"
        }
      }
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // For Google signup flow, if the URL is /onboard, respect it
      if (url.includes('/onboard')) {
        return url;
      }
      
      // Handle URL
      if (url.startsWith(baseUrl)) return url;
      // Allow relative URLs
      else if (url.startsWith("/")) return `${baseUrl}${url}`;
      return baseUrl;
    },
    async jwt({ token, user, trigger, session, account }) {
      // Handle OAuth provider account - fetch existing user data from backend
      if (account && account.provider === "google") {
        console.log("Google auth completed, fetching user data from backend...");
        
        try {
          // Fetch existing user data from backend
          const response = await fetch(`${backendUrl}/auth/google-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: token.email,
              name: token.name,
            }),
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log("Fetched user data from backend:", userData);
            
            // Update token with user data from backend
            token.id = userData.id;
            token.name = userData.name;
            token.email = userData.email;
            token.role = userData.role;
            token.orgType = userData.orgType || null;
            token.orgId = userData.orgId || null;
            token.grade = userData.grade || null;
            token.teacherBio = userData.teacherBio || null;
          } else {
            console.log("User not found in backend, will redirect to onboard");
            // If user doesn't exist, we'll let the redirect callback handle it
            token.needsOnboard = true;
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          token.needsOnboard = true;
        }
      }
      
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.role = user.role;
        token.orgType = user.orgType || null;
        token.orgId = user.orgId || null;
        token.grade = user.grade || null;
        token.teacherBio = user.teacherBio || null;
      }
      if (trigger === "update" && session?.user) {
        const updated = session.user;
        token.name = updated.name ?? token.name;
        token.email = updated.email ?? token.email;
        token.role = updated.role ?? token.role;
        token.orgType = updated.orgType ?? token.orgType;
        token.orgId = updated.orgId ?? token.orgId;
        token.grade = updated.grade ?? token.grade;
        token.teacherBio = updated.teacherBio ?? token.teacherBio;
        token.id = updated.id ?? token.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.orgType = token.orgType;
        session.user.orgId = token.orgId;
        session.user.grade = token.grade;
        session.user.teacherBio = token.teacherBio;
        session.user.needsOnboard = token.needsOnboard || false;
        
        // Enhanced logging for debugging
        console.log("NextAuth session data:", {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          orgType: session.user.orgType,
          orgId: session.user.orgId,
          needsOnboard: session.user.needsOnboard,
          hasToken: !!token,
          tokenFields: Object.keys(token || {}).join(', ')
        });
      }
      return session;
    },
  },
};

export default authOptions;
