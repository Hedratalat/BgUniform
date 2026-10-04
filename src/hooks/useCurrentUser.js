// Suggested location: src/hooks/useCurrentUser.js
// Adjust the "../firebase" import path below to match where your
// firebase.js actually lives relative to this file.

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";

/**
 * Returns the current Firebase user.
 * - undefined -> auth state is still loading
 * - null      -> no user is logged in
 * - object    -> the logged-in user
 */
export default function useCurrentUser() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return user;
}
