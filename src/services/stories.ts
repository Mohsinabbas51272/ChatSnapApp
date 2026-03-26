import { db, storage } from './firebaseConfig';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  Timestamp,
  doc,
  deleteDoc 
} from 'firebase/firestore';

export interface Story {
  id?: string;
  userId: string;
  displayName: string;
  photoURL?: string;
  imageUri: string;
  timestamp: any;
}

import * as FileSystem from 'expo-file-system';

export const uploadStory = async (userId: string, displayName: string, imageUri: string, filter: string = 'none') => {
  try {
    // Read the image as a Base64 string
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Prefix with data URI header
    const imageData = `data:image/jpeg;base64,${base64}`;
    
    const storiesRef = collection(db, 'stories');
    await addDoc(storiesRef, {
      userId,
      displayName,
      imageUri: imageData,
      filter,
      timestamp: serverTimestamp(),
    });
    
    console.log('Story uploaded successfully to Firestore as Base64');
  } catch (error) {
    console.error('Error in uploadStory:', error);
    throw error;
  }
};

export const fetchStories = async (): Promise<Story[]> => {
  const storiesRef = collection(db, 'stories');
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const q = query(
    storiesRef,
    where('timestamp', '>=', Timestamp.fromDate(twentyFourHoursAgo))
  );

  const querySnapshot = await getDocs(q);
  const stories: Story[] = [];
  querySnapshot.forEach((doc) => {
    stories.push({ id: doc.id, ...doc.data() } as Story);
  });

  // Sort by timestamp local side if needed, or index it
  return stories.sort((a, b) => (b.timestamp?.seconds ?? 0) - (a.timestamp?.seconds ?? 0));
};

export const deleteStory = async (storyId: string) => {
  try {
    const storyRef = doc(db, 'stories', storyId);
    await deleteDoc(storyRef);
    console.log('Story deleted successfully');
  } catch (error) {
    console.error('Error deleting story:', error);
    throw error;
  }
};
