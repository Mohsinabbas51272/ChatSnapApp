import * as Contacts from 'expo-contacts';
import { db } from './firebaseConfig';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';

export interface ContactUser {
  uid: string;
  phoneNumber: string;
  displayName: string;
  photoURL?: string;
  isFromContact?: boolean; // New field to identify local contacts
}

// Simple time-based cache to avoid re-fetching on every tab switch
let cachedContacts: ContactUser[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const syncContacts = async (): Promise<ContactUser[]> => {
  // Return cached results if still valid
  const now = Date.now();
  if (cachedContacts && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedContacts;
  }

  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Access to contacts was denied');
  }

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.FirstName, Contacts.Fields.LastName],
  });

  if (data.length === 0) return [];

  // Extract all phone numbers from device contacts and clean them
  // Remove non-digits and handle potential country codes (simplified)
  const devicePhoneNumbers = new Set(
    data
      .flatMap(contact => contact.phoneNumbers || [])
      .map(pn => pn.number?.replace(/\D/g, ''))
      .filter((num): num is string => !!num)
  );

  if (devicePhoneNumbers.size === 0) return [];

  // Fetch all registered users from Firestore
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    const registeredUsers: ContactUser[] = [];
    
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      const cleanedUserPhone = userData.phoneNumber?.replace(/\D/g, '');
      
      // Filter: Only include if their number is in the device's contacts
      if (cleanedUserPhone && devicePhoneNumbers.has(cleanedUserPhone)) {
        registeredUsers.push({
          uid: doc.id,
          phoneNumber: userData.phoneNumber,
          displayName: userData.displayName,
          photoURL: userData.photoURL,
          isFromContact: true,
        });
      }
    });

    // Update cache
    cachedContacts = registeredUsers;
    cacheTimestamp = now;

    return registeredUsers;
  } catch (error) {
    console.error('Error fetching users:', error);
    return cachedContacts || [];
  }
};

// Global search for any registered user
export const searchUsers = async (searchTerm: string): Promise<ContactUser[]> => {
  if (!searchTerm || searchTerm.length < 2) return [];
  
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    const results: ContactUser[] = [];
    
    const lowerSearch = searchTerm.toLowerCase();
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const name = (data.displayName || '').toLowerCase();
      const phone = (data.phoneNumber || '');
      
      if (name.includes(lowerSearch) || phone.includes(searchTerm)) {
        results.push({
          uid: doc.id,
          phoneNumber: data.phoneNumber,
          displayName: data.displayName,
          photoURL: data.photoURL,
          isFromContact: false, // These are from global search
        });
      }
    });

    return results;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

export const fetchUsersByIds = async (uids: string[]): Promise<ContactUser[]> => {
  if (uids.length === 0) return [];
  
  try {
    const usersRef = collection(db, 'users');
    const results: ContactUser[] = [];
    
    // Firestore IN queries are limited to 10-30 items depending on version, 
    // but we'll fetch them individually or use a structured approach if possible.
    // For small friend lists, individual getDoc is fine, but let's use a simple loop.
    for (const uid of uids) {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        results.push({
          uid: userDoc.id,
          phoneNumber: data.phoneNumber,
          displayName: data.displayName,
          photoURL: data.photoURL,
          isFromContact: false, // Default to false unless matched elsewhere
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error fetching users by IDs:', error);
    return [];
  }
};

// Allow manual cache invalidation (e.g. on pull-to-refresh)
export const invalidateContactsCache = () => {
  cachedContacts = null;
  cacheTimestamp = 0;
};
