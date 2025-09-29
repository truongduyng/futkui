import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/Colors';
import SPORTS_OPTIONS from '@/constants/Sports';

interface SportFilterBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onApplySports: (sports: string[]) => void;
  initialSports?: string[];
}

export const SportFilterBottomSheet = React.memo(function SportFilterBottomSheet({
  isVisible,
  onClose,
  onApplySports,
  initialSports,
}: SportFilterBottomSheetProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  useEffect(() => {
    if (initialSports) {
      setSelectedSports(initialSports);
    }
  }, [initialSports]);

  const handleClose = () => {
    onClose();
  };

  const handleSportToggle = (sportKey: string) => {
    setSelectedSports(prev => {
      if (prev.includes(sportKey)) {
        return prev.filter(s => s !== sportKey);
      } else {
        return [...prev, sportKey];
      }
    });
  };

  const handleApplySports = () => {
    onApplySports(selectedSports);
    onClose();
  };

  const handleClearSports = () => {
    setSelectedSports([]);
    onApplySports([]);
    onClose();
  };

  const getSportKey = (nameKey: string) => {
    return nameKey.replace('sports.', '');
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
              {t('filters.sports', 'Sports')}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Sports Filter */}
            <View style={styles.section}>
              <View style={styles.sportsGrid}>
                {SPORTS_OPTIONS.map((sport, index) => {
                  const sportKey = getSportKey(sport.nameKey);
                  const isSelected = selectedSports.includes(sportKey);

                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.sportOption,
                        {
                          backgroundColor: isSelected
                            ? colors.tint
                            : (isDark ? '#2C2C2E' : '#F2F2F7'),
                          borderColor: isSelected
                            ? colors.tint
                            : (isDark ? '#3A3A3C' : '#E5E7EB'),
                        }
                      ]}
                      onPress={() => handleSportToggle(sportKey)}
                    >
                      <Text style={styles.sportEmoji}>{sport.emoji}</Text>
                      <Text style={[
                        styles.sportName,
                        {
                          color: isSelected ? 'white' : colors.text,
                          fontWeight: isSelected ? '600' : '400',
                        }
                      ]}>
                        {t(sport.nameKey)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.clearButton,
                {
                  backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                  borderColor: isDark ? '#3A3A3C' : '#E5E7EB',
                }
              ]}
              onPress={handleClearSports}
            >
              <Text style={[styles.clearButtonText, { color: colors.text }]}>
                {t('filters.clear', 'Clear')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.applyButton,
                { backgroundColor: colors.tint }
              ]}
              onPress={handleApplySports}
            >
              <Text style={styles.applyButtonText}>
                {t('filters.apply', 'Apply')}
              </Text>
            </TouchableOpacity>
          </View>
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
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
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
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    minWidth: 100,
  },
  sportEmoji: {
    fontSize: 16,
  },
  sportName: {
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});