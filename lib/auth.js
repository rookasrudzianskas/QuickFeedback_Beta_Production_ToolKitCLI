import React, { useState, useEffect, useContext, createContext } from 'react';
import Router from 'next/router';
import cookie from 'js-cookie';

import firebase from './firebase';
import { createUser } from './db';

const authContext = createContext();

export function AuthProvider({ children }) {
  const auth = useProvideAuth();
  return <authContext.Provider value={auth}>{children}</authContext.Provider>;
}

export const useAuth = () => {
  return useContext(authContext);
};

function useProvideAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleUser = async (rawUser) => {
    if (rawUser) {
      const user = await formatUser(rawUser);
      const { token, ...userWithoutToken } = user;

      createUser(user.uid, userWithoutToken);
      setUser(user);

      cookie.set('quick-feedback-auth', true, {
        expires: 1
      });

      setLoading(false);
      return user;
    } else {
      setUser(false);
      cookie.remove('quick-feedback-auth');

      setLoading(false);
      return false;
    }
  };

  const signinWithEmail = (email, password) => {
    setLoading(true);
    return firebase
        .auth()
        .signInWithEmailAndPassword(email, password)
        .then((response) => {
          handleUser(response.user);
          Router.push('/sites');
        });
  };

  const signinWithGitHub = () => {
    setLoading(true);
    return firebase
      .auth()
      .signInWithPopup(new firebase.auth.GithubAuthProvider())
      .then((response) => handleUser(response.user));
  };

  const signinWithGoogle = () => {
    setLoading(true);
    return firebase
      .auth()
      .signInWithPopup(new firebase.auth.GoogleAuthProvider())
      .then((response) => handleUser(response.user));
  };

  const signout = () => {
    Router.push('/');

    return firebase
      .auth()
      .signOut()
      .then(() => handleUser(false));
  };

  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged(handleUser);

    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    signinWithGitHub,
    signinWithGoogle,
    signinWithEmail,
    signout
  };
}

const getStripeRole = async () => {
  await firebase.auth().currentUser.getIdToken(true);
  const decodedToken = await firebase.auth().currentUser.getIdTokenResult();

  return decodedToken.claims.stripeRole || 'free';
};

const formatUser = async (user) => {
  return {
    uid: user.uid,
    email: user.email,
    name: user.displayName,
    token: user.xa,
    provider: user.providerData[0].providerId,
    photoUrl: user.photoURL,
    stripeRole: await getStripeRole()
  };
};
