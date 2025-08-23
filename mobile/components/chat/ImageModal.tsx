import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useImageSaver } from '@/hooks/useImageSaver';

interface ImageModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export function ImageModal({ visible, imageUrl, onClose }: ImageModalProps) {
  const { t } = useTranslation();
  const [imageLoading, setImageLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const { saveImageToGallery, isSaving } = useImageSaver(false);

  // Reset loading state when imageUrl changes
  useEffect(() => {
    if (imageUrl) {
      setImageLoading(true);
    }
  }, [imageUrl]);

  const handleSaveImage = async () => {
    if (imageUrl) {
      const success = await saveImageToGallery(imageUrl);
      if (success) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
        }, 2000);
      }
    }
  };

  // Reset success state when modal opens/closes
  useEffect(() => {
    if (!visible) {
      setShowSuccess(false);
    }
  }, [visible]);

  if (!imageUrl) return null;

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.fullScreenModalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={[styles.fullScreenImage, { width: screenWidth * 0.9, height: screenHeight * 0.8 }]}
            resizeMode="contain"
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
          />
          {imageLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="white" />
            </View>
          )}
        </View>
        {/* Success message */}
        {showSuccess && (
          <View style={styles.successMessage}>
            <View style={styles.successContent}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.successText}>{t('chat.imageSavedShort')}</Text>
            </View>
          </View>
        )}
        
        <TouchableOpacity style={styles.buttonContainer} activeOpacity={1}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSaveImage}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="download-outline" size={20} color="white" />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.closeFullScreenButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeFullScreenText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreenModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    zIndex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 2,
  },
  buttonContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullScreenButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullScreenText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  successMessage: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -25 }],
    zIndex: 10,
  },
  successContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  successText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
