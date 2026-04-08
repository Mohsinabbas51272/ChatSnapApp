import { db, auth } from './firebaseConfig';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  Timestamp,
  doc,
  deleteDoc,
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface StoryViewerInfo {
  userId: string;
  displayName: string;
  count: number;
  lastViewed: string;
}

export interface Story {
  id?: string;
  userId: string;
  displayName: string;
  photoURL?: string;
  imageUri: string;
  timestamp: any;
  viewers?: StoryViewerInfo[];
  viewCount?: number;
}

export interface Highlight {
  id?: string;
  userId: string;
  name: string;
  stories: Story[];
  coverImage: string;
  timestamp: any;
}

import * as FileSystem from 'expo-file-system/legacy';

export const uploadStory = async (userId: string | null, displayName: string, imageUri: string, filter: string = 'none') => {
  try {
    const authUid = auth.currentUser?.uid;
    const ownerId = userId || authUid;

    console.log('--- STORY UPLOAD DEBUG ---');
    console.log('Current Auth UID:', authUid);
    console.log('Passed User ID:', userId);
    console.log('Final Owner ID:', ownerId);
    console.log('Firebase Auth Object exists:', !!auth.currentUser);

    if (!ownerId) {
      throw new Error('Unable to upload story: missing authenticated user ID');
    }

    // High-quality resizing and compression for HD stories
    let imageData: string;
    try {
      const result = await manipulateAsync(
        imageUri,
        [{ resize: { width: 1080 } }],
        { compress: 0.8, format: SaveFormat.JPEG, base64: true }
      );
      imageData = `data:image/jpeg;base64,${result.base64}`;
    } catch (manipError) {
      // Fallback: read original file as base64 if manipulation fails
      console.warn('Image manipulation failed, using original:', manipError);
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      imageData = `data:image/jpeg;base64,${base64}`;
    }
    
    const storiesRef = collection(db, 'stories');
    await addDoc(storiesRef, {
      userId: ownerId,
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
export const recordStoryView = async (storyId: string, userId: string, displayName: string) => {
  try {
    const storyRef = doc(db, 'stories', storyId);
    const storySnap = await getDoc(storyRef);
    
    if (storySnap.exists()) {
      const data = storySnap.data();
      const viewers: StoryViewerInfo[] = data.viewers || [];
      const viewerIndex = viewers.findIndex(v => v.userId === userId);
      
      if (viewerIndex > -1) {
        // User has already viewed, increment their count
        viewers[viewerIndex] = {
          ...viewers[viewerIndex],
          count: (viewers[viewerIndex].count || 1) + 1,
          lastViewed: new Date().toISOString()
        };
      } else {
        // New viewer
        viewers.push({
          userId,
          displayName,
          count: 1,
          lastViewed: new Date().toISOString()
        });
      }
      
      await updateDoc(storyRef, {
        viewers,
        viewCount: viewers.length
      });
      console.log('Story view recorded for:', displayName);
    }
  } catch (error) {
    console.error('Error recording story view:', error);
  }
};

export const createHighlight = async (userId: string, name: string, stories: Story[]) => {
  try {
    const highlightsRef = collection(db, 'highlights');
    await addDoc(highlightsRef, {
      userId,
      name,
      stories,
      coverImage: stories[0]?.imageUri || '',
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating highlight:', error);
    throw error;
  }
};

export const fetchUserHighlights = async (userId: string): Promise<Highlight[]> => {
  const highlightsRef = collection(db, 'highlights');
  const q = query(highlightsRef, where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Highlight));
};

export const deleteHighlight = async (highlightId: string) => {
  const ref = doc(db, 'highlights', highlightId);
  await deleteDoc(ref);
};

export const fetchExpiredStories = async (userId: string): Promise<Story[]> => {
  const storiesRef = collection(db, 'stories');
  const q = query(storiesRef, where('userId', '==', userId));
  const snap = await getDocs(q);
  
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  // Filter for expired stories (older than 24h)
  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as Story))
    .filter(s => {
      const ts = s.timestamp?.toMillis ? s.timestamp.toMillis() : (s.timestamp?.seconds ? s.timestamp.seconds * 1000 : 0);
      return ts < twentyFourHoursAgo;
    })
    .sort((a, b) => (b.timestamp?.seconds ?? 0) - (a.timestamp?.seconds ?? 0));
};
