import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface DuesPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitPayment: (billImageUri?: string) => void;
  requiredAmount: number;
  periodKey: string;
}

export function DuesPaymentModal({
  visible,
  onClose,
  onSubmitPayment,
  requiredAmount,
  periodKey,
}: DuesPaymentModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const [billImageUri, setBillImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmitPayment(billImageUri || undefined);

      // Reset form
      setBillImageUri(null);
      onClose();
    } catch (error) {
      console.error('Failed to submit payment:', error);
      Alert.alert(t('common.error'), t('chat.failedToSubmitPayment'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        setBillImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert(t('common.error'), t('chat.errorPickImage'));
    }
  };


  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={[styles.bottomSheet, { backgroundColor: colors.background }]}
          activeOpacity={1}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('chat.submitPayment')}
            </Text>
          </View>

        <View style={styles.content}>
          {/* Dues Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              💰 {periodKey}
            </Text>
            <Text style={[styles.requiredAmount, { color: colors.text }]}>
              {requiredAmount}
            </Text>
          </View>

          {/* Bill Upload */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('chat.paymentProof')} ({t('chat.optional')})
            </Text>

            {billImageUri ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: billImageUri }} style={styles.billImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setBillImageUri(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#F44336" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.uploadButton,
                  {
                    borderColor: colors.tabIconDefault,
                  },
                ]}
                onPress={pickImage}
              >
                <Ionicons name="camera" size={24} color={colors.tabIconDefault} />
                <Text style={[styles.uploadText, { color: colors.tabIconDefault }]}>
                  {t('chat.uploadBill')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

          {/* Submit Button */}
          <View style={styles.bottomSection}>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.submitButton, { backgroundColor: colors.tint }]}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.submitText}>
                  {t('chat.submitPayment')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 10,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  submitText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  requiredAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  uploadButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    fontSize: 14,
    marginTop: 8,
  },
  imageContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  billImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
});
