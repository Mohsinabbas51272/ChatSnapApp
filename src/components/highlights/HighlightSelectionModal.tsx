import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, Image, TextInput, ActivityIndicator } from 'react-native';
import { X, Check, Search } from 'lucide-react-native';
import { fetchExpiredStories, createHighlight, Story } from '../../services/stories';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getContrastText } from '../../services/colors';

interface HighlightSelectionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const HighlightSelectionModal: React.FC<HighlightSelectionModalProps> = ({ isVisible, onClose, onSuccess }) => {
  const user = useSelector((state: RootState) => state.auth);
  const { primaryColor, isDarkMode } = useSelector((state: RootState) => state.theme);
  
  const [loading, setLoading] = useState(true);
  const [expiredStories, setExpiredStories] = useState<Story[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [highlightName, setHighlightName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isVisible && user?.uid) {
      loadStories();
    }
  }, [isVisible, user?.uid]);

  const loadStories = async () => {
    setLoading(true);
    try {
      const data = await fetchExpiredStories(user!.uid!);
      setExpiredStories(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!highlightName.trim() || selectedIds.length === 0) return;
    setIsSaving(true);
    try {
      const selectedStories = expiredStories.filter(s => selectedIds.includes(s.id!));
      await createHighlight(user!.uid!, highlightName, selectedStories);
      onSuccess();
      onClose();
      // Reset
      setHighlightName('');
      setSelectedIds([]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const textColor = isDarkMode ? '#FFFFFF' : '#1a1c1e';
  const subTextColor = isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)';
  const surfaceHigh = isDarkMode ? '#1F2937' : '#F0F2FA';

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View className="flex-1 bg-black/60 justify-end">
        <View 
          className="h-[90%] bg-white dark:bg-[#0f111a] rounded-t-[40px] overflow-hidden"
          style={{ backgroundColor: isDarkMode ? '#0f111a' : '#FFFFFF' }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between p-6 border-b border-gray-500/10">
            <TouchableOpacity onPress={onClose} className="p-2 bg-gray-500/10 rounded-full">
              <X size={20} color={textColor} />
            </TouchableOpacity>
            <Text className="text-lg font-black" style={{ color: textColor }}>New Highlight</Text>
            <TouchableOpacity 
              onPress={handleCreate}
              disabled={!highlightName.trim() || selectedIds.length === 0 || isSaving}
              className={`px-5 py-2 rounded-full ${(!highlightName.trim() || selectedIds.length === 0) ? 'opacity-30' : ''}`}
              style={{ backgroundColor: primaryColor }}
            >
              {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : (
                <Text className="font-black text-xs" style={{ color: getContrastText(primaryColor) }}>SAVE</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Name Input */}
          <View className="p-6">
             <Text className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: subTextColor }}>Highlight Name</Text>
             <TextInput 
               className="h-14 px-5 rounded-2xl font-bold text-lg"
               style={{ backgroundColor: surfaceHigh, color: textColor }}
               placeholder="e.g. Vacation, Besties..."
               placeholderTextColor={subTextColor}
               value={highlightName}
               onChangeText={setHighlightName}
             />
          </View>

          {/* Story Selection */}
          <View className="flex-1 px-6">
            <Text className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: subTextColor }}>
              Select Stories ({selectedIds.length})
            </Text>
            
            {loading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator color={primaryColor} size="large" />
              </View>
            ) : expiredStories.length > 0 ? (
              <FlatList 
                data={expiredStories}
                numColumns={3}
                keyExtractor={item => item.id!}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isSelected = selectedIds.includes(item.id!);
                  return (
                    <TouchableOpacity 
                      onPress={() => toggleSelect(item.id!)}
                      activeOpacity={0.8}
                      className="m-1 flex-1 aspect-[2/3] rounded-xl overflow-hidden relative"
                    >
                      <Image source={{ uri: item.imageUri }} className="w-full h-full" />
                      {isSelected && (
                        <View className="absolute inset-0 bg-black/40 items-center justify-center">
                           <View className="w-8 h-8 rounded-full bg-blue-500 items-center justify-center border-2 border-white">
                              <Check size={16} color="#FFF" />
                           </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            ) : (
              <View className="flex-1 items-center justify-center p-10 opacity-30">
                 <Search size={64} color={subTextColor} />
                 <Text className="mt-4 text-center font-bold" style={{ color: subTextColor }}>No expired stories found to add</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default HighlightSelectionModal;
