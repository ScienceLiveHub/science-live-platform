/*
 * TODO: Placeholder generated sign out page - switch to better-auth-ui, or just a component that calls sign out
 *
 */

import { authClient } from "@/auth/auth-client";
import { useEffect } from "react";
import { Link } from "react-router-dom";

export function SignOut() {
  useEffect(() => {
    const signOut = async () => {
      await authClient.signOut();
    };
    signOut().catch(console.error);
  }, []);

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", padding: "20px" }}>
      <h1>You signed out</h1>
      <p>
        <Link to="/" className="btn btn-primary">
          <i className="fas fa-flask"></i>
          <span>Back to home</span>
        </Link>
      </p>
    </div>
  );
}
