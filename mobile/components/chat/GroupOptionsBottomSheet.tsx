import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

const { height: screenHeight } = Dimensions.get('window');

interface GroupOptionsBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onShareGroup: () => void;
  onLeaveGroup: () => void;
}

export function GroupOptionsBottomSheet({
  visible,
  onClose,
  onShareGroup,
  onLeaveGroup,
}: GroupOptionsBottomSheetProps) {
  const { t } = useTranslation();
  const colors = Colors['light'];
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, opacity]);

  const handleShareGroup = () => {
    onClose();
    setTimeout(() => onShareGroup(), 100);
  };

  const handleLeaveGroup = () => {
    onClose();
    setTimeout(() => onLeaveGroup(), 100);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  backgroundColor: colors.background,
                  transform: [{ translateY }],
                },
              ]}
            >
              <View style={styles.header}>
                <View style={[styles.handle, { backgroundColor: colors.tabIconDefault }]} />
              </View>

              <View style={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {t('groupOptions.title')}
                </Text>

                <TouchableOpacity
                  style={[styles.option, styles.optionFirst]}
                  onPress={handleShareGroup}
                  activeOpacity={0.6}
                >
                  <View style={styles.optionLeft}>
                    <Ionicons
                      name="share-outline"
                      size={24}
                      color={colors.tint}
                      style={styles.optionIcon}
                    />
                    <Text style={[styles.optionText, { color: colors.text }]}>
                      {t('groupOptions.shareGroup')}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.option, styles.optionLast]}
                  onPress={handleLeaveGroup}
                  activeOpacity={0.6}
                >
                  <View style={styles.optionLeft}>
                    <Ionicons
                      name="exit-outline"
                      size={24}
                      color="#FF3B30"
                      style={styles.optionIcon}
                    />
                    <Text style={[styles.optionText, { color: '#FF3B30' }]}>
                      {t('groupOptions.leaveGroup')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.tabIconDefault + '10' }]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelText, { color: colors.text }]}>
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    marginBottom: 2,
  },
  optionFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  optionLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 0,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  cancelButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
