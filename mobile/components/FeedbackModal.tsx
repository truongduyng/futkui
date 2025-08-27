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
import { useThemeColor } from '../hooks/useThemeColor';
import { getTranslation } from '../i18n';
import { useToast } from '../hooks/useToast';
import { useInstantDB } from '../hooks/useInstantDB';

interface FeedbackModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isVisible,
  onClose,
}) => {
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const buttonColor = useThemeColor({}, 'tint');
  const { showSuccess, showError } = useToast();
  const { instantClient, ensureUserHasBotGroup, sendMessage, useProfile } = useInstantDB();
  const { user } = instantClient.useAuth();
  const profileQuery = useProfile();

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      showError(getTranslation('feedback.error'), getTranslation('feedback.errorMessage'));
      return;
    }

    if (!user || !profileQuery?.data?.profiles?.[0]) {
      showError(getTranslation('feedback.error'), 'Please wait for your profile to load.');
      return;
    }

    setIsSubmitting(true);
    try {
      const profile = profileQuery.data.profiles[0];

      // Ensure user has a bot group for feedback
      const botGroupId = await ensureUserHasBotGroup(profile.id);

      if (botGroupId) {
        // Send feedback as message to bot group
        await sendMessage({
          groupId: botGroupId,
          content: `${feedback.trim()}`,
          authorId: profile.id,
          authorName: profile.displayName || profile.handle || 'User',
        });
      }

      setFeedback('');
      onClose();
      showSuccess(getTranslation('feedback.success'), getTranslation('feedback.successMessage'));
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showError(getTranslation('feedback.error'), 'Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFeedback('');
    onClose();
  };

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
              {getTranslation('feedback.title')}
            </Text>
            <Text style={[styles.subtitle, { color: textColor }]}>
              {getTranslation('about.sendFeedbackDescription')}
            </Text>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
          >
            <TextInput
              style={[
                styles.textInput,
                {
                  borderColor,
                  color: textColor,
                  backgroundColor: backgroundColor,
                }
              ]}
              placeholder={getTranslation('feedback.messagePlaceholder')}
              placeholderTextColor={textColor + '80'}
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={6}
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
                {isSubmitting ? getTranslation('feedback.submitting') : getTranslation('feedback.submit')}
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
    maxHeight: '80%',
    minHeight: 400,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
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
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    height: 120,
    textAlignVertical: 'top',
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
