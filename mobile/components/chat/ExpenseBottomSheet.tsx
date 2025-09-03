import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { uploadToR2 } from '@/utils/r2Upload';

interface ExpenseBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (amount: number, billImageUrl?: string, note?: string) => void;
  matchId: string;
}

export const ExpenseBottomSheet = React.memo(function ExpenseBottomSheet({
  isVisible,
  onClose,
  onSubmit,
  matchId,
}: ExpenseBottomSheetProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [billImage, setBillImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setAmount('');
    setNote('');
    setBillImage(null);
    onClose();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('common.permissionDenied'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsUploading(true);
      try {
        const filename = `bill_${Date.now()}.jpg`;
        const uploadedUrl = await uploadToR2(result.assets[0].uri, filename);
        setBillImage(uploadedUrl);
      } catch (error) {
        console.error('Error uploading bill image:', error);
        Alert.alert(t('common.error'), t('common.uploadFailed'));
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = async () => {
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert(t('common.error'), t('expense.invalidAmount'));
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(amountValue, billImage || undefined, note.trim() || undefined);
      handleClose();
    } catch (error) {
      console.error('Error creating expense:', error);
      Alert.alert(t('common.error'), t('expense.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.container,
          { backgroundColor: colors.background }
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('expense.addExpense')}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('expense.amount')} *
            </Text>
            <TextInput
              style={[
                styles.amountInput,
                {
                  backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                  color: colors.text,
                  borderColor: isDark ? '#3A3A3C' : '#E5E7EB',
                }
              ]}
              value={amount}
              onChangeText={setAmount}
              placeholder={t('expense.enterAmount')}
              placeholderTextColor={colors.tabIconDefault}
              keyboardType="numeric"
              autoFocus
            />
          </View>

          {/* Note Input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('expense.note')}
            </Text>
            <TextInput
              style={[
                styles.noteInput,
                {
                  backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                  color: colors.text,
                  borderColor: isDark ? '#3A3A3C' : '#E5E7EB',
                }
              ]}
              value={note}
              onChangeText={setNote}
              placeholder={t('expense.enterNote')}
              placeholderTextColor={colors.tabIconDefault}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Bill Image Section */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>
              {t('expense.billImage')}
            </Text>
            {billImage ? (
              <View style={styles.imagePreview}>
                <Image source={{ uri: billImage }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setBillImage(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.imagePickerButton,
                  {
                    backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                    borderColor: isDark ? '#3A3A3C' : '#E5E7EB',
                  }
                ]}
                onPress={pickImage}
                disabled={isUploading}
              >
                <Ionicons
                  name={isUploading ? "hourglass" : "camera"}
                  size={24}
                  color={colors.tabIconDefault}
                />
                <Text style={[styles.imagePickerText, { color: colors.tabIconDefault }]}>
                  {isUploading ? t('common.uploading') : t('expense.addBillImage')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: colors.tint,
                opacity: (amount && !isSubmitting) ? 1 : 0.5,
              }
            ]}
            onPress={handleSubmit}
            disabled={!amount || isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? t('common.creating') : t('expense.createExpense')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 500,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    textAlign: 'center',
  },
  noteInput: {
    fontSize: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 80,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  imagePreview: {
    position: 'relative',
    alignItems: 'center',
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
  },
  submitButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});