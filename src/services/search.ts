import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'user' | 'group' | 'message';
  photoURL?: string;
  data: any;
}

export const searchGlobal = async (searchTerm: string): Promise<SearchResult[]> => {
  if (!searchTerm || searchTerm.length < 2) return [];

  const results: SearchResult[] = [];
  const loweredQuery = searchTerm.toLowerCase();

  try {
    // 1. Search Users
    const usersRef = collection(db, 'users');
    const userSnap = await getDocs(query(usersRef, limit(20)));
    userSnap.forEach(doc => {
      const data = doc.data();
      if (data.displayName?.toLowerCase().includes(loweredQuery) || 
          data.email?.toLowerCase().includes(loweredQuery)) {
        results.push({
          id: doc.id,
          title: data.displayName || 'Unknown User',
          subtitle: data.email || data.phoneNumber || '',
          type: 'user',
          photoURL: data.photoURL,
          data
        });
      }
    });

    // 2. Search Groups
    const groupsRef = collection(db, 'groups');
    const groupSnap = await getDocs(query(groupsRef, limit(20)));
    groupSnap.forEach(doc => {
      const data = doc.data();
      if (data.name?.toLowerCase().includes(loweredQuery)) {
        results.push({
          id: doc.id,
          title: data.name,
          subtitle: `${data.memberIds?.length || 0} members`,
          type: 'group',
          photoURL: data.photoURL,
          data
        });
      }
    });

    return results;
  } catch (error) {
    console.error('Global search error:', error);
    return [];
  }
};
