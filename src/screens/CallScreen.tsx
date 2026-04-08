import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, StatusBar, Dimensions } from 'react-native';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Camera, X, Volume2, Maximize, Minimize } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { respondToCall, endCall, subscribeToCall, Call } from '../services/calls';
import { getContrastText } from '../services/colors';

const { width, height } = Dimensions.get('window');

const CallScreen = ({ route, navigation }: any) => {
  const { callId, isIncoming, partnerName, partnerPhotoURL, type } = route.params;
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  const user = useSelector((state: RootState) => state.auth);

  const [status, setStatus] = useState<'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed'>('ringing');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(type === 'video');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsub = subscribeToCall(callId, (callData) => {
      setStatus(callData.status);
      if (callData.status === 'ended' || callData.status === 'rejected') {
        setTimeout(() => navigation.goBack(), 1500);
      }
    });

    return () => {
      unsub();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callId]);

  useEffect(() => {
    if (status === 'accepted') {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [status]);

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAccept = () => respondToCall(callId, 'accepted');
  const handleReject = () => {
    respondToCall(callId, 'rejected');
    navigation.goBack();
  };
  const handleEnd = () => {
    endCall(callId);
    navigation.goBack();
  };

  const textColor = '#FFFFFF';
  const subTextColor = 'rgba(255,255,255,0.7)';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Background Image / Placeholder */}
      <View style={StyleSheet.absoluteFill}>
        {partnerPhotoURL ? (
          <Image source={{ uri: partnerPhotoURL }} style={styles.bgImage} blurRadius={Platform.OS === 'ios' ? 20 : 10} />
        ) : (
          <View style={[styles.bgImage, { backgroundColor: isDarkMode ? '#0f111a' : '#222' }]} />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <Animated.View entering={FadeIn.duration(800)} style={styles.header}>
          <View style={styles.avatarContainer}>
             {partnerPhotoURL ? (
                <Image source={{ uri: partnerPhotoURL }} style={styles.avatar} />
             ) : (
                <View style={[styles.avatar, styles.placeholderAvatar, { backgroundColor: primaryColor }]}>
                   <Text style={styles.avatarText}>{(partnerName || '?').charAt(0)}</Text>
                </View>
             )}
          </View>
          <Text style={styles.nameText}>{partnerName}</Text>
          <Text style={styles.statusText}>
            {status === 'ringing' ? (isIncoming ? 'Incoming Call...' : 'Calling...') : 
             status === 'accepted' ? formatDuration(duration) : 
             status === 'ended' ? 'Call Ended' : 'Declined'}
          </Text>
        </Animated.View>

        <View style={styles.controlsContainer}>
          {status === 'ringing' && isIncoming ? (
             <Animated.View entering={ZoomIn} style={styles.actionButtons}>
                <TouchableOpacity onPress={handleReject} style={[styles.controlButton, styles.rejectButton]}>
                   <PhoneOff size={32} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleAccept} style={[styles.controlButton, styles.acceptButton]}>
                   <Phone size={32} color="#FFF" />
                </TouchableOpacity>
             </Animated.View>
          ) : (
             <Animated.View entering={FadeIn.delay(300)} style={styles.activeControls}>
                <View style={styles.controlRow}>
                   <TouchableOpacity onPress={() => setIsMuted(!isMuted)} style={styles.roundButton}>
                      {isMuted ? <MicOff size={24} color="#FFF" /> : <Mic size={24} color="#FFF" />}
                   </TouchableOpacity>
                   <TouchableOpacity onPress={() => setIsVideoOn(!isVideoOn)} style={styles.roundButton}>
                      {isVideoOn ? <Video size={24} color="#FFF" /> : <VideoOff size={24} color="#FFF" />}
                   </TouchableOpacity>
                   <TouchableOpacity style={styles.roundButton}>
                      <Volume2 size={24} color="#FFF" />
                   </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleEnd} style={[styles.controlButton, styles.rejectButton, styles.endCallLarge]}>
                   <PhoneOff size={32} color="#FFF" />
                </TouchableOpacity>
             </Animated.View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgImage: {
    width: '100%',
    height: '100%',
    opacity: 0.6,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  avatarContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  placeholderAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 50,
    fontWeight: '900',
    color: '#FFF',
  },
  nameText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: -1,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginTop: 8,
  },
  controlsContainer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  activeControls: {
    alignItems: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
  },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  endCallLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  roundButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  }
});

import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

export default CallScreen;
