import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';

interface CreateDuesCycleModalProps {
  visible: boolean;
  onClose: () => void;
  onCreateCycle: (cycleData: {
    periodKey: string;
    amountPerMember: number;
    deadline: number;
  }) => Promise<void>;
}

export function CreateDuesCycleModal({
  visible,
  onClose,
  onCreateCycle,
}: CreateDuesCycleModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const [periodKey, setPeriodKey] = useState('');
  const [amountPerMember, setAmountPerMember] = useState('');
  const [deadline, setDeadline] = useState(new Date());
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!periodKey.trim()) {
      Alert.alert(t('common.error'), t('chat.periodKeyRequired'));
      return;
    }

    if (!amountPerMember.trim() || isNaN(Number(amountPerMember))) {
      Alert.alert(t('common.error'), t('chat.validAmountRequired'));
      return;
    }

    const amount = Number(amountPerMember);
    if (amount <= 0) {
      Alert.alert(t('common.error'), t('chat.amountMustBePositive'));
      return;
    }

    if (deadline.getTime() <= Date.now()) {
      Alert.alert(t('common.error'), t('chat.deadlineInFuture'));
      return;
    }

    setIsCreating(true);
    try {
      await onCreateCycle({
        periodKey: periodKey.trim(),
        amountPerMember: amount,
        deadline: deadline.getTime(),
      });

      // Reset form
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create dues cycle:', error);
      Alert.alert(t('common.error'), t('chat.failedToCreateCycle'));
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setPeriodKey('');
    setAmountPerMember('');
    setDeadline(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default to 1 week from now
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setDeadline(selectedDate);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
            <Text style={[styles.cancelText, { color: colors.text }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('chat.createDuesCycle')}
          </Text>
          <TouchableOpacity
            onPress={handleCreate}
            style={[styles.createButton, { backgroundColor: colors.tint }]}
            disabled={isCreating || !periodKey.trim() || !amountPerMember.trim()}
          >
            <Text style={styles.createText}>
              {isCreating ? t('common.creating') : t('common.create')}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Period Key */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('chat.periodDescription')} *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.tabIconDefault,
                },
              ]}
              value={periodKey}
              onChangeText={setPeriodKey}
              placeholder={t('chat.periodPlaceholder')}
              placeholderTextColor={colors.tabIconDefault}
              maxLength={50}
            />
          </View>

          {/* Amount */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('chat.amountPerMember')} *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.tabIconDefault,
                },
              ]}
              value={amountPerMember}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                setAmountPerMember(cleaned);
              }}
              placeholder="0.00"
              placeholderTextColor={colors.tabIconDefault}
              keyboardType="numeric"
            />
          </View>

          {/* Deadline */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('chat.paymentDeadline')} *
            </Text>
            <View style={styles.pickerContainer}>
              <DateTimePicker
                themeVariant={isDark ? 'dark' : 'light'}
                value={deadline}
                mode="date"
                onChange={handleDateChange}
                minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
                style={styles.picker}
                textColor={colors.text}
                accentColor={colors.tint}
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
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  pickerContainer: {
    borderRadius: 12,
    marginLeft: -10,
  },
  picker: {
    width: '100%',
    height: 200,
  },
});