import * as Contacts from 'expo-contacts';
import { db } from './firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

export interface ContactUser {
  uid: string;
  phoneNumber: string;
  displayName: string;
  photoURL?: string;
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

  // Extract all phone numbers
  const phoneNumbers = data
    .flatMap(contact => contact.phoneNumbers || [])
    .map(pn => pn.number?.replace(/\D/g, ''))
    .filter((num): num is string => !!num);

  if (phoneNumbers.length === 0) return [];

  // Fetch all registered users from Firestore
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    const registeredUsers: ContactUser[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      registeredUsers.push({
        uid: doc.id,
        phoneNumber: data.phoneNumber,
        displayName: data.displayName,
        photoURL: data.photoURL,
      });
    });

    // Update cache
    cachedContacts = registeredUsers;
    cacheTimestamp = now;

    return registeredUsers;
  } catch (error) {
    console.error('Error fetching users:', error);
    return cachedContacts || []; // Return stale cache on error if available
  }
};

// Allow manual cache invalidation (e.g. on pull-to-refresh)
export const invalidateContactsCache = () => {
  cachedContacts = null;
  cacheTimestamp = 0;
};
