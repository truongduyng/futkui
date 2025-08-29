import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';
import { getTranslation } from '../../i18n';
import { useToast } from '../../hooks/useToast';

interface ReportModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (reason: string, description: string) => void;
  type: 'message' | 'user' | 'group';
  targetName?: string;
}

const REPORT_REASONS = {
  message: [
    'spam',
    'harassment',
    'inappropriate_content',
    'hate_speech',
    'violence',
    'misinformation',
    'other',
  ],
  user: [
    'harassment',
    'spam',
    'fake_profile',
    'inappropriate_behavior',
    'hate_speech',
    'impersonation',
    'other',
  ],
  group: [
    'inappropriate_content',
    'harassment',
    'spam',
    'hate_speech',
    'violence',
    'misinformation',
    'inappropriate_behavior',
    'other',
  ],
};

export const ReportModal: React.FC<ReportModalProps> = ({
  isVisible,
  onClose,
  onSubmit,
  type,
  targetName,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const buttonColor = useThemeColor({}, 'tint');
  const { showSuccess, showError } = useToast();

  const handleSubmit = async () => {
    if (!selectedReason) {
      showError(getTranslation('report.error'), getTranslation('report.selectReason'));
      return;
    }

    setIsSubmitting(true);
    try {
      onSubmit(selectedReason, description.trim());
      setSelectedReason('');
      setDescription('');
      onClose();
      showSuccess(getTranslation('report.success'), getTranslation('report.submitted'));
    } catch {
      showError(getTranslation('report.error'), getTranslation('report.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setDescription('');
    onClose();
  };

  const reasons = REPORT_REASONS[type] || [];

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity
          style={[styles.bottomSheet, { backgroundColor }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <View style={[styles.handleBar, { backgroundColor: borderColor }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: textColor }]}>
              {type === 'message'
                ? getTranslation('report.reportMessage')
                : type === 'user'
                ? getTranslation('report.reportUser')
                : getTranslation('report.reportGroup')}
            </Text>
          </View>

          {targetName && (
            <Text style={[styles.targetText, { color: textColor }]}>
              {getTranslation('report.reporting')}: {targetName}
            </Text>
          )}

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            {/* Reasons */}
            <Text style={[styles.sectionTitle, { color: textColor }]}>
              {getTranslation('report.reason')}
            </Text>

            <View style={styles.reasonsList}>
              {reasons.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reasonOption,
                    { borderColor },
                    selectedReason === reason && { backgroundColor: buttonColor + '20' }
                  ]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <View style={[styles.radioButton, { borderColor: borderColor }]}>
                    {selectedReason === reason && (
                      <View style={[styles.radioButtonInner, { backgroundColor: buttonColor }]} />
                    )}
                  </View>
                  <Text style={[styles.reasonText, { color: textColor }]}>
                    {getTranslation(`report.reasons.${reason}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description */}
            <Text style={[styles.sectionTitle, { color: textColor, marginTop: 16 }]}>
              {getTranslation('report.description')} ({getTranslation('common.optional')})
            </Text>

            <TextInput
              style={[
                styles.textInput,
                {
                  borderColor,
                  color: textColor,
                  backgroundColor: backgroundColor,
                }
              ]}
              placeholder={getTranslation('report.descriptionPlaceholder')}
              placeholderTextColor={textColor + '80'}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor }]}
              onPress={handleClose}
            >
              <Text style={[styles.cancelButtonText, { color: textColor }]}>
                {getTranslation('common.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: buttonColor },
                isSubmitting && styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? getTranslation('report.submitting') : getTranslation('report.submit')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area padding
    maxHeight: '90%',
    minHeight: 750,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
    opacity: 0.3,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  targetText: {
    fontSize: 14,
    paddingHorizontal: 20,
    marginTop: 12,
    opacity: 0.8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  reasonsList: {
    marginBottom: 16,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  reasonText: {
    fontSize: 14,
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    height: 70,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
