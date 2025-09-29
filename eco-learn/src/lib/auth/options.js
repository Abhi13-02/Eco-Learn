import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
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
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
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
        
        // Log session data for debugging
        console.log("NextAuth session:", {
          id: session.user.id,
          role: session.user.role,
          orgType: session.user.orgType,
          orgId: session.user.orgId
        });
      }
      return session;
    },
  },
};

export default authOptions;
