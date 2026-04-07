import React from 'react';
import { View, Modal, TouchableOpacity, Image, Text, Dimensions, StyleSheet } from 'react-native';
import { X, Download, FileText } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';

interface MediaViewerModalProps {
  isVisible: boolean;
  item: any | null;
  onClose: () => void;
  primaryColor: string;
}

const { width, height } = Dimensions.get('window');

const MediaViewerModal: React.FC<MediaViewerModalProps> = ({ isVisible, item, onClose, primaryColor }) => {
  if (!item) return null;

  const isImage = item.type === 'image';
  const isDocument = item.type === 'document';

  return (
    <Modal visible={isVisible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <SafeAreaView style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isImage ? 'Photo' : 'Document'}
          </Text>
          <TouchableOpacity style={styles.downloadButton}>
            <Download size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </SafeAreaView>

        <View style={styles.content}>
          {isImage ? (
            <Animated.View entering={FadeIn.duration(300)} style={styles.mediaContainer}>
              <Image 
                source={{ uri: item.text }} 
                style={styles.fullImage} 
                resizeMode="contain" 
              />
            </Animated.View>
          ) : isDocument ? (
            <Animated.View entering={SlideInDown} style={styles.documentContainer}>
               <View className="mb-6 w-32 h-32 rounded-[40px] bg-white/10 items-center justify-center border border-white/20">
                  <FileText size={64} color="#FFFFFF" />
               </View>
               <Text className="text-white font-black text-2xl text-center px-10">
                  Document Shared
               </Text>
               <Text className="text-white/60 text-center mt-3 px-12">
                  Click the download button above to save this document to your device.
               </Text>
            </Animated.View>
          ) : null}
        </View>

        <SafeAreaView style={styles.footer}>
           <Text style={styles.footerText}>
             {new Date(item.timestamp?.toDate ? item.timestamp.toDate() : item.timestamp).toLocaleString()}
           </Text>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 10,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 15,
  },
  downloadButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaContainer: {
    width: width,
    height: height * 0.7,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  documentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingBottom: 20,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: 'bold',
  }
});

export default React.memo(MediaViewerModal);
