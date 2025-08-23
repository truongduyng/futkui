import { useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useToast';

export function useImageSaver(showToast = true) {
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const saveImageToGallery = async (imageUrl: string) => {
    if (!imageUrl) return false;
    
    try {
      setIsSaving(true);
      
      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showError(t('chat.permissionNeeded'), t('chat.mediaLibraryPermission'));
        return false;
      }
      
      // Download the image
      const fileUri = FileSystem.documentDirectory + `image_${Date.now()}.jpg`;
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
      
      if (downloadResult.status === 200) {
        // Save to media library
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        if (showToast) {
          showSuccess(t('chat.imageSaved'), t('chat.imageSavedToGallery'));
        }
        return true;
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error saving image:', error);
      if (showToast) {
        showError(t('common.error'), t('chat.imageSaveError'));
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveImageToGallery,
    isSaving,
  };
}