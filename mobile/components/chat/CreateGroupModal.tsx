import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useInstantDB } from '@/hooks/useInstantDB';
import { uploadToR2 } from '@/utils/r2Upload';
import { id } from '@instantdb/react-native';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateGroup: (groupData: { name: string; description: string; avatarUrl: string; sports: string[] }) => void;
}


const SPORTS_OPTIONS = [
  { emoji: '⚽', nameKey: 'sports.football' },
  { emoji: '🏓', nameKey: 'sports.pickleball' },
  { emoji: '🏸', nameKey: 'sports.badminton' },
];

export function CreateGroupModal({ visible, onClose, onCreateGroup }: CreateGroupModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const { instantClient } = useInstantDB();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('createGroup.permissionRequired'), t('createGroup.permissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('createGroup.errorName'));
      return;
    }

    if (!description.trim()) {
      Alert.alert(t('common.error'), t('createGroup.errorDescription'));
      return;
    }

    if (!selectedImage) {
      Alert.alert(t('common.error'), t('createGroup.errorImage'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload image
      const fileName = `group-avatar-${id()}-${Date.now()}.jpg`;
      const avatarUrl = await uploadToR2(selectedImage, fileName);

      onCreateGroup({
        name: name.trim(),
        description: description.trim(),
        avatarUrl,
        sports: selectedSports,
      });

      // Reset form
      setName('');
      setDescription('');
      setSelectedImage(null);
      setSelectedSports([]);
      onClose();
    } catch (error) {
      console.error('Error uploading group image:', error);
      Alert.alert(t('common.error'), t('createGroup.failedUpload'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    setSelectedImage(null);
    setSelectedSports([]);
    onClose();
  };

  const toggleSport = (sportName: string) => {
    setSelectedSports(prev =>
      prev.includes(sportName)
        ? prev.filter(s => s !== sportName)
        : [...prev, sportName]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={[styles.cancelButton, { color: colors.tint }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>{t('createGroup.title')}</Text>
          <TouchableOpacity onPress={handleCreate} disabled={isSubmitting}>
            <Text style={[styles.createButton, { color: colors.tint }]}>
              {isSubmitting ? t('common.creating') : t('common.create')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createGroup.clubImage')}</Text>
            <View style={styles.imagePickerSection}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                ) : (
                  <View style={[styles.imagePlaceholder, { borderColor: colors.tabIconDefault }]}>
                    <Text style={[styles.placeholderText, { color: colors.tabIconDefault }]}>
                      {t('createGroup.tapSelectImage')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createGroup.sportsOptional')}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.tabIconDefault }]}>
              {t('createGroup.selectSports')}
            </Text>
            <View style={styles.sportsGrid}>
              {SPORTS_OPTIONS.map((sport) => {
                const sportName = t(sport.nameKey);
                return (
                  <TouchableOpacity
                    key={sport.nameKey}
                    style={[
                      styles.sportOption,
                      selectedSports.includes(sportName) && {
                        backgroundColor: colors.tint,
                        borderColor: colors.tint
                      }
                    ]}
                    onPress={() => toggleSport(sportName)}
                  >
                    <Text style={styles.sportEmoji}>{sport.emoji}</Text>
                    <Text style={[
                      styles.sportName,
                      { color: selectedSports.includes(sportName) ? 'white' : colors.text }
                    ]}>
                      {sportName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createGroup.clubName')}</Text>
            <TextInput
              style={[styles.input, {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.tabIconDefault
              }]}
              value={name}
              onChangeText={setName}
              placeholder={t('createGroup.placeholderName')}
              placeholderTextColor={colors.tabIconDefault}
              maxLength={50}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('createGroup.description')}</Text>
            <TextInput
              style={[styles.textArea, {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.tabIconDefault
              }]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('createGroup.placeholderDescription')}
              placeholderTextColor={colors.tabIconDefault}
              multiline
              numberOfLines={4}
              maxLength={200}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    fontSize: 16,
  },
  createButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  imagePickerSection: {
    alignItems: 'center',
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: 60,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  placeholderText: {
    fontSize: 12,
    textAlign: 'center',
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 8,
  },
  sportEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  sportName: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
