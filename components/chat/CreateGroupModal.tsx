import { Colors } from '@/constants/Colors';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateGroup: (groupData: { name: string; description: string; avatar: string }) => void;
}

const AVATAR_OPTIONS = ['⚽', '🏓', '🏸'];

export function CreateGroupModal({ visible, onClose, onCreateGroup }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('⚽');
  const colors = Colors['light'];

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a club name');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a club description');
      return;
    }

    onCreateGroup({
      name: name.trim(),
      description: description.trim(),
      avatar: selectedAvatar,
    });

    // Reset form
    setName('');
    setDescription('');
    setSelectedAvatar('⚽');
    onClose();
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    setSelectedAvatar('⚽');
    onClose();
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
            <Text style={[styles.cancelButton, { color: colors.tint }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Create Sports Club</Text>
          <TouchableOpacity onPress={handleCreate}>
            <Text style={[styles.createButton, { color: colors.tint }]}>Create</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sport</Text>
            <View style={styles.avatarGrid}>
              {AVATAR_OPTIONS.map((avatar) => (
                <TouchableOpacity
                  key={avatar}
                  style={[
                    styles.avatarOption,
                    selectedAvatar === avatar && { backgroundColor: colors.tint }
                  ]}
                  onPress={() => setSelectedAvatar(avatar)}
                >
                  <Text style={styles.avatarText}>{avatar}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Club Name</Text>
            <TextInput
              style={[styles.input, {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.tabIconDefault
              }]}
              value={name}
              onChangeText={setName}
              placeholder="Enter club name..."
              placeholderTextColor={colors.tabIconDefault}
              maxLength={50}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.textArea, {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.tabIconDefault
              }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your sports club..."
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
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',},
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  avatarText: {
    fontSize: 24,
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
