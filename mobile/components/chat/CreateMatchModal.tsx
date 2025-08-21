import { Colors } from "@/constants/Colors";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from 'react-i18next';

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

export function CreateMatchModal({
  visible,
  onClose,
  onCreateMatch,
}: CreateMatchModalProps) {
  const { t } = useTranslation();
  const [description, setDescription] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const colors = Colors["light"];

  const handleCreate = () => {
    if (!description.trim()) {
      Alert.alert(
        t('common.error'),
        t('chat.errorMatchDetails'),
      );
      return;
    }

    // Use selected date/time
    const matchDateTime = selectedDate;

    onCreateMatch({
      title: t('chat.matchEvent'),
      description: description.trim(),
      gameType: "match",
      location: "",
      matchDate: matchDateTime.getTime(),
    });

    // Reset form
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setDescription("");
    setSelectedDate(new Date());
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const onChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
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
            {t('chat.createMatchTitle')}
          </Text>
          <TouchableOpacity
            onPress={handleCreate}
            style={[styles.createButton, { backgroundColor: colors.tint }]}
          >
            <Text style={styles.createText}>{t('common.create')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('chat.matchDetails')}
            </Text>
            <Text
              style={[styles.sectionHint, { color: colors.tabIconDefault }]}
            >
              {t('chat.matchDetailsHint')}
            </Text>
            <TextInput
              style={[
                styles.textArea,
                { color: colors.text, borderColor: colors.tabIconDefault },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('chat.matchDetailsPlaceholder')}
              placeholderTextColor={colors.tabIconDefault}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('chat.dateTime')}
            </Text>
            <Text
              style={[styles.sectionHint, { color: colors.tabIconDefault }]}
            >
              {t('chat.dateTimeHint')}
            </Text>
            <View style={[styles.pickerContainer]}>
              <DateTimePicker
                themeVariant="light"
                value={selectedDate}
                mode="datetime"
                onChange={onChange}
                minimumDate={new Date()}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  createText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
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
    fontWeight: "600",
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
  pickerContainer: {
    borderRadius: 12,
    marginLeft: -10,
  },
  picker: {
    width: "100%",
    height: 200,
  },
});
