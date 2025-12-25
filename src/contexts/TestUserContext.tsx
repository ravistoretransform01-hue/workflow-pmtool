import React, { createContext, useContext, useState, useEffect } from 'react';

export interface TestUser {
  id: string;
  name: string;
  avatarColor: string;
}

interface TestUserContextType {
  currentUser: TestUser;
  testUsers: TestUser[];
  switchUser: (userId: string) => void;
  addTestUser: (name: string, avatarColor: string) => void;
}

const TestUserContext = createContext<TestUserContextType | undefined>(undefined);

const defaultUsers: TestUser[] = [
  { id: 'blake-id-001', name: 'Blake Newton', avatarColor: 'hsl(220, 90%, 60%)' },
  { id: 'kyle-id-002', name: 'Kyle Newton', avatarColor: 'hsl(340, 85%, 65%)' },
  { id: 'brookolyn-id-003', name: 'Brookolyn Newton', avatarColor: 'hsl(15, 85%, 65%)' },
  { id: 'daniel-id-004', name: 'Daniel Pledger', avatarColor: 'hsl(280, 75%, 60%)' },
  { id: 'client-id-005', name: 'Client', avatarColor: 'hsl(160, 75%, 55%)' },
  { id: 'wpplatform-id-006', name: 'WP Platform', avatarColor: 'hsl(250, 80%, 60%)' },
];

// Email mapping for test users
export const testUserEmails: Record<string, string> = {
  'blake-id-001': 'blakeanewton@gmail.com',
  'kyle-id-002': 'jkylenewton@gmail.com',
  'brookolyn-id-003': 'brookolynalexis@gmail.com',
  'daniel-id-004': 'DanielPledger@Gmail.com',
  'client-id-005': 'client@example.com',
  'wpplatform-id-006': 'wpplatform@example.com',
};

export function TestUserProvider({ children }: { children: React.ReactNode }) {
  const [testUsers, setTestUsers] = useState<TestUser[]>(() => {
    const stored = localStorage.getItem('test_users');
    if (stored) {
      const storedUsers = JSON.parse(stored);
      // Ensure all default users are present
      const mergedUsers = [...defaultUsers];
      storedUsers.forEach((user: TestUser) => {
        if (!defaultUsers.find(du => du.id === user.id)) {
          mergedUsers.push(user);
        }
      });
      return mergedUsers;
    }
    return defaultUsers;
  });

  const [currentUser, setCurrentUser] = useState<TestUser>(() => {
    const stored = localStorage.getItem('current_test_user');
    if (stored) {
      return JSON.parse(stored);
    }
    return testUsers[0];
  });

  useEffect(() => {
    localStorage.setItem('test_users', JSON.stringify(testUsers));
  }, [testUsers]);

  useEffect(() => {
    localStorage.setItem('current_test_user', JSON.stringify(currentUser));
  }, [currentUser]);

  const switchUser = (userId: string) => {
    const user = testUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      window.location.reload(); // Reload to fetch new user's data
    }
  };

  const addTestUser = (name: string, avatarColor: string) => {
    const newUser: TestUser = {
      id: `${name.toLowerCase()}-id-${Date.now()}`,
      name,
      avatarColor,
    };
    setTestUsers([...testUsers, newUser]);
    setCurrentUser(newUser);
    window.location.reload();
  };

  return (
    <TestUserContext.Provider value={{ currentUser, testUsers, switchUser, addTestUser }}>
      {children}
    </TestUserContext.Provider>
  );
}

export function useTestUser() {
  const context = useContext(TestUserContext);
  if (!context) {
    throw new Error('useTestUser must be used within TestUserProvider');
  }
  return context;
}
