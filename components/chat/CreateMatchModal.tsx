import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface CreateMatchModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateMatch: (matchData: {
    title: string;
    description: string;
    gameType: string;
    location: string;
    matchDate: number;
  }) => void;
}

const GAME_TYPE_SUGGESTIONS = [
  { id: 'internal', label: '🏠 Internal Match', description: 'Match between group members' },
  { id: 'external', label: '🆚 External Match', description: 'Match against another team' },
  { id: 'friendly', label: '🤝 Friendly Match', description: 'Casual friendly game' },
  { id: 'tournament', label: '🏆 Tournament', description: 'Competition tournament' },
  { id: 'training', label: '💪 Training Session', description: 'Practice and training' },
];

export function CreateMatchModal({ visible, onClose, onCreateMatch }: CreateMatchModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gameType, setGameType] = useState('');
  const [location, setLocation] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const colors = Colors['light'];

  const handleCreate = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a match title');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter match details including time, location, and game type');
      return;
    }

    if (!location.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return;
    }

    // Parse the date and time
    let matchDateTime: Date;
    if (matchDate && matchTime) {
      const dateStr = `${matchDate} ${matchTime}`;
      matchDateTime = new Date(dateStr);
    } else {
      // Default to 1 hour from now if no specific date/time provided
      matchDateTime = new Date();
      matchDateTime.setHours(matchDateTime.getHours() + 1);
    }

    if (isNaN(matchDateTime.getTime())) {
      Alert.alert('Error', 'Please enter a valid date and time');
      return;
    }

    onCreateMatch({
      title: title.trim(),
      description: description.trim(),
      gameType: gameType || 'friendly',
      location: location.trim(),
      matchDate: matchDateTime.getTime(),
    });

    // Reset form
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setGameType('');
    setLocation('');
    setMatchDate('');
    setMatchTime('');
    setShowSuggestions(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectGameType = (type: string) => {
    setGameType(type);
    setShowSuggestions(false);
  };

  const fillSampleData = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    setTitle('Weekly Football Match');
    setDescription('Join us for our weekly football match! Please come 15 minutes early for warm-up. Bring your own water bottle and wear appropriate gear.');
    setGameType('internal');
    setLocation('Central Park Football Field');
    setMatchDate(dateStr);
    setMatchTime('18:00');
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
          <Text style={[styles.title, { color: colors.text }]}>Create Match</Text>
          <TouchableOpacity onPress={handleCreate} style={[styles.createButton, { backgroundColor: colors.tint }]}>
            <Text style={styles.createText}>Create</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity 
            onPress={fillSampleData}
            style={[styles.sampleButton, { backgroundColor: colors.tint + '20', borderColor: colors.tint }]}
          >
            <Ionicons name="bulb-outline" size={16} color={colors.tint} />
            <Text style={[styles.sampleText, { color: colors.tint }]}>Fill with sample data</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Match Title *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault }]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Weekly Football Match"
              placeholderTextColor={colors.tabIconDefault}
              maxLength={100}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Match Details *</Text>
            <Text style={[styles.sectionHint, { color: colors.tabIconDefault }]}>
              Include time, location details, game type, what to bring, etc.
            </Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: colors.tabIconDefault }]}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., Join us for football at Central Park this Saturday at 6pm. Internal match between group members. Please bring water bottle and wear sports gear. Meet at the main entrance 15 minutes early."
              placeholderTextColor={colors.tabIconDefault}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Game Type</Text>
            <TouchableOpacity
              style={[styles.input, styles.gameTypeSelector, { borderColor: colors.tabIconDefault }]}
              onPress={() => setShowSuggestions(!showSuggestions)}
            >
              <Text style={[styles.gameTypeText, { color: gameType ? colors.text : colors.tabIconDefault }]}>
                {gameType ? GAME_TYPE_SUGGESTIONS.find(t => t.id === gameType)?.label : 'Select game type...'}
              </Text>
              <Ionicons 
                name={showSuggestions ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={colors.tabIconDefault} 
              />
            </TouchableOpacity>
            
            {showSuggestions && (
              <View style={[styles.suggestions, { backgroundColor: colors.background, borderColor: colors.tabIconDefault }]}>
                {GAME_TYPE_SUGGESTIONS.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={styles.suggestionItem}
                    onPress={() => selectGameType(type.id)}
                  >
                    <Text style={[styles.suggestionLabel, { color: colors.text }]}>{type.label}</Text>
                    <Text style={[styles.suggestionDescription, { color: colors.tabIconDefault }]}>
                      {type.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Location *</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.tabIconDefault }]}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., Central Park Football Field"
              placeholderTextColor={colors.tabIconDefault}
              maxLength={150}
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Date & Time (Optional)</Text>
            <Text style={[styles.sectionHint, { color: colors.tabIconDefault }]}>
              Leave empty to schedule for 1 hour from now
            </Text>
            <View style={styles.dateTimeContainer}>
              <TextInput
                style={[styles.dateInput, { color: colors.text, borderColor: colors.tabIconDefault }]}
                value={matchDate}
                onChangeText={setMatchDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.tabIconDefault}
                maxLength={10}
              />
              <TextInput
                style={[styles.timeInput, { color: colors.text, borderColor: colors.tabIconDefault }]}
                value={matchTime}
                onChangeText={setMatchTime}
                placeholder="HH:MM"
                placeholderTextColor={colors.tabIconDefault}
                maxLength={5}
              />
            </View>
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
  sampleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 16,
  },
  sampleText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
  },
  gameTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameTypeText: {
    fontSize: 16,
  },
  suggestions: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  suggestionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  suggestionDescription: {
    fontSize: 12,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateInput: {
    flex: 2,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  timeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
});