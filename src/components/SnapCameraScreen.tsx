import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, BackHandler } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import { X, Zap, RefreshCw, Send, Clock, Image as ImageIcon, ZapOff } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Smile, Glasses, User } from 'lucide-react-native';

const SnapCameraScreen = ({ isVisible, onClose, onSend }: any) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [image, setImage] = useState<string | null>(null);
  const [timer, setTimer] = useState(5);
  const [activeFilter, setActiveFilter] = useState('none');
  const cameraRef = useRef<any>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [video, setVideo] = useState<string | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);

  // Stable Camera component must be declared BEFORE any early returns
  // to follow React's rules of hooks
  const CameraPart = useMemo(() => {
    if (!permission?.granted) return null;
    return (
      <CameraView 
        ref={cameraRef} 
        style={StyleSheet.absoluteFill} 
        facing={facing}
        enableTorch={flash === 'on'}
      />
    );
  }, [facing, flash, permission?.granted]);

  useEffect(() => {
    const onBackPress = () => {
      if (isVisible) {
        if (image || video) {
          setImage(null);
          setVideo(null);
        } else {
          onClose();
        }
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [isVisible, image, onClose]);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <Modal visible={isVisible} animationType="fade">
        <View className="flex-1 items-center justify-center bg-surface px-10">
          <Text className="text-onSurface text-center mb-6 font-medium">We need your permission to show the camera to take snaps!</Text>
          <TouchableOpacity onPress={requestPermission} className="px-8 py-4 rounded-full shadow-lg"
                            style={{ backgroundColor: '#4963ff' }}>
            <Text className="text-white font-bold text-lg">Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} className="mt-6">
             <Text className="text-onSurface-variant font-bold">Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current && !isCapturing && !isRecording) {
      setIsCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.1,
        });
        setImage(photo.uri);
      } catch (err: any) {
        console.error('Error taking picture:', err);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const startRecording = async () => {
    if (cameraRef.current && !isRecording) {
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      try {
        const videoData = await cameraRef.current.recordAsync({
          maxDuration: 10,
          quality: '720p',
        });
        setVideo(videoData.uri);
      } catch (err: any) {
        console.error('Error recording video:', err);
      } finally {
        setIsRecording(false);
        setRecordingStartTime(null);
      }
    }
  };

  const stopRecording = async () => {
    if (cameraRef.current && isRecording) {
      // Ensure a minimum recording duration of 500ms to prevent the 
      // "Recording was stopped before any data could be produced" error.
      const now = Date.now();
      const duration = recordingStartTime ? now - recordingStartTime : 0;
      
      if (duration < 500) {
        // Wait a bit longer if the user released too quickly
        await new Promise(resolve => setTimeout(resolve, 500 - duration));
      }
      
      try {
        await cameraRef.current.stopRecording();
      } catch (e: any) {
        console.error('Error stopping recording:', e);
      }
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.2,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSend = () => {
    if (image || video) {
      onSend(image || video, timer, activeFilter);
      setImage(null);
      setVideo(null);
      onClose();
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide">
      <View className="flex-1 bg-black">
        {!image ? (
          <View className="flex-1">
            {CameraPart}
            
            {/* Filter Overlays (Separate from CameraView to avoid flickering) */}
            <View className="absolute inset-0" pointerEvents="none">
               {activeFilter === 'vintage' && <View className="absolute inset-0 bg-orange-500/10" />}
               {activeFilter === 'bw' && <View className="absolute inset-0 bg-black/20" />}
               {activeFilter === 'glasses' && (
                 <View className="absolute inset-0 items-center justify-center">
                    <Glasses color="white" size={120} strokeWidth={2} style={{ marginTop: -50 }} />
                 </View>
               )}
               {activeFilter === 'smile' && (
                 <View className="absolute inset-0 items-center justify-center">
                    <Smile color="#e966ff" size={100} style={{ marginTop: 20 }} />
                 </View>
               )}
               <View className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
            </View>

            <SafeAreaView className="flex-1 justify-between p-6">
              {/* Top Controls */}
              <View className="flex-row justify-between">
                <TouchableOpacity onPress={onClose} className="w-12 h-12 rounded-full items-center justify-center"
                                  style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <X color="white" size={28} />
                </TouchableOpacity>
                
                <View className="flex-row gap-3">
                  <TouchableOpacity 
                    onPress={() => setFlash(f => f === 'on' ? 'off' : 'on')}
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    {flash === 'on' ? <Zap color="#FFFC00" size={24} fill="#FFFC00" /> : <ZapOff color="white" size={24} />}
                  </TouchableOpacity>
                  <TouchableOpacity 
                     onPress={() => setFacing(current => (current === 'back' ? 'front' : 'back'))}
                     className="w-12 h-12 rounded-full items-center justify-center"
                     style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <RefreshCw color="white" size={24} />
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                 {/* Filter Selector */}
                 <View className="flex-row justify-center mb-6">
                    {[
                      { id: 'none', icon: User },
                      { id: 'vintage', icon: Sparkles },
                      { id: 'bw', icon: ImageIcon },
                      { id: 'glasses', icon: Glasses },
                      { id: 'smile', icon: Smile },
                    ].map(f => (
                      <TouchableOpacity 
                        key={f.id} 
                        onPress={() => setActiveFilter(f.id)}
                        className="w-12 h-12 rounded-full items-center justify-center mx-2"
                        style={{ 
                          backgroundColor: activeFilter === f.id ? '#4963ff' : 'rgba(0,0,0,0.5)',
                        }}
                      >
                        <f.icon color={activeFilter === f.id ? 'white' : 'rgba(255,255,255,0.7)'} size={24} />
                      </TouchableOpacity>
                    ))}
                 </View>

                {/* Bottom Controls */}
                <View className="flex-row items-center justify-between mb-6">
                  <TouchableOpacity onPress={pickImage} className="w-14 h-14 rounded-2xl items-center justify-center border border-white/10"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                     <ImageIcon color="white" size={24} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={takePicture} 
                    onLongPress={startRecording}
                    onPressOut={stopRecording}
                    disabled={isCapturing}
                    className={`w-20 h-20 rounded-full items-center justify-center p-1 ${isCapturing || isRecording ? 'opacity-80' : ''}`}
                    style={{ 
                      borderWidth: 4,
                      borderColor: isRecording ? '#ff6e85' : 'white',
                    }}
                  >
                    <View className={`w-full h-full rounded-full ${isRecording ? 'bg-error scale-90' : 'bg-white'}`} />
                  </TouchableOpacity>

                  <View className="flex-col gap-2 rounded-full items-center p-1.5"
                        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    {[5, 10].map(t => (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setTimer(t)}
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={timer === t ? { backgroundColor: '#4963ff' } : undefined}
                      >
                        <Text className={`text-xs font-bold text-white ${timer === t ? 'opacity-100' : 'opacity-40'}`}>{t}s</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </SafeAreaView>
          </View>
        ) : (
          <View className="flex-1 bg-black">
            {image ? (
              <Image source={{ uri: image }} className="flex-1" resizeMode="contain" />
            ) : (
                <View className="flex-1 items-center justify-center">
                    <Text className="text-white font-bold">Video Snap Ready</Text>
                </View>
            )}
            
            {/* Captured Filter Overlays */}
            <View className="absolute inset-0" pointerEvents="none">
              {activeFilter === 'vintage' && <View className="absolute inset-0 bg-orange-500/10" />}
              {activeFilter === 'bw' && <View className="absolute inset-0 bg-black/20" />}
              {activeFilter === 'glasses' && (
                <View className="absolute inset-0 items-center justify-center">
                   <Glasses color="white" size={120} strokeWidth={2} style={{ marginTop: -50 }} />
                </View>
              )}
              {activeFilter === 'smile' && (
                <View className="absolute inset-0 items-center justify-center">
                   <Smile color="#e966ff" size={100} style={{ marginTop: 20 }} />
                </View>
              )}
            </View>

            <SafeAreaView className="absolute inset-0 p-6 justify-between">
              <View className="flex-row justify-between">
                <TouchableOpacity onPress={() => setImage(null)} className="w-12 h-12 rounded-full items-center justify-center"
                                  style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <X color="white" size={28} />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => setTimer(timer === 5 ? 10 : 5)}
                  className="flex-row items-center px-4 py-2 rounded-full"
                  style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                >
                  <Clock color="white" size={20} />
                  <Text className="text-white font-bold ml-2">{timer}s</Text>
                </TouchableOpacity>
              </View>

              <View className="items-end">
                <TouchableOpacity 
                  onPress={handleSend}
                  className="w-16 h-16 rounded-full items-center justify-center bg-primary shadow-lg"
                >
                  <Send color="white" size={32} />
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default SnapCameraScreen;
