import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface PollOption {
  id: string;
  text: string;
}

interface CreatePollModalProps {
  visible: boolean;
  onClose: () => void;
  onCreatePoll: (question: string, options: PollOption[], allowMultiple: boolean, expiresAt?: number) => void;
}

export function CreatePollModal({ visible, onClose, onCreatePoll }: CreatePollModalProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' }
  ]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const colors = Colors['light'];

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, { id: generateId(), text: '' }]);
    }
  };

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter(option => option.id !== id));
    }
  };

  const updateOption = (id: string, text: string) => {
    setOptions(options.map(option => 
      option.id === id ? { ...option, text } : option
    ));
  };

  const handleCreate = () => {
    if (!question.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    const validOptions = options.filter(option => option.text.trim());
    if (validOptions.length < 2) {
      Alert.alert('Error', 'Please provide at least 2 options');
      return;
    }

    onCreatePoll(question.trim(), validOptions, allowMultiple);
    
    // Reset form
    setQuestion('');
    setOptions([
      { id: '1', text: '' },
      { id: '2', text: '' }
    ]);
    setAllowMultiple(false);
    onClose();
  };

  const handleClose = () => {
    // Reset form
    setQuestion('');
    setOptions([
      { id: '1', text: '' },
      { id: '2', text: '' }
    ]);
    setAllowMultiple(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Create Poll</Text>
          <TouchableOpacity onPress={handleCreate} style={[styles.createButton, { backgroundColor: colors.tint }]}>
            <Text style={styles.createText}>Create</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Question</Text>
            <TextInput
              style={[styles.questionInput, { color: colors.text, borderColor: colors.tabIconDefault }]}
              value={question}
              onChangeText={setQuestion}
              placeholder="Ask a question..."
              placeholderTextColor={colors.tabIconDefault}
              multiline
              maxLength={200}
            />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Options</Text>
              <TouchableOpacity 
                onPress={addOption}
                disabled={options.length >= 6}
                style={[
                  styles.addOptionButton,
                  { backgroundColor: options.length >= 6 ? colors.tabIconDefault : colors.tint }
                ]}
              >
                <Ionicons name="add" size={16} color="white" />
              </TouchableOpacity>
            </View>

            {options.map((option, index) => (
              <View key={option.id} style={styles.optionContainer}>
                <View style={styles.optionInputContainer}>
                  <Text style={[styles.optionNumber, { color: colors.tabIconDefault }]}>
                    {index + 1}
                  </Text>
                  <TextInput
                    style={[styles.optionInput, { color: colors.text, borderColor: colors.tabIconDefault }]}
                    value={option.text}
                    onChangeText={(text) => updateOption(option.id, text)}
                    placeholder={`Option ${index + 1}`}
                    placeholderTextColor={colors.tabIconDefault}
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <TouchableOpacity
                      onPress={() => removeOption(option.id)}
                      style={styles.removeOptionButton}
                    >
                      <Ionicons name="close" size={16} color={colors.tabIconDefault} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => setAllowMultiple(!allowMultiple)}
            >
              <View style={styles.settingLeft}>
                <Text style={[styles.settingText, { color: colors.text }]}>
                  Allow multiple choices
                </Text>
                <Text style={[styles.settingDescription, { color: colors.tabIconDefault }]}>
                  Let people select more than one option
                </Text>
              </View>
              <View style={[
                styles.toggle,
                { backgroundColor: allowMultiple ? colors.tint : colors.tabIconDefault }
              ]}>
                <View style={[
                  styles.toggleThumb,
                  allowMultiple && styles.toggleThumbActive
                ]} />
              </View>
            </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  createText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  questionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addOptionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionContainer: {
    marginBottom: 12,
  },
  optionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionNumber: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
    width: 16,
    textAlign: 'center',
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  removeOptionButton: {
    marginLeft: 8,
    padding: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLeft: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
});