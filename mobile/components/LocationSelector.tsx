import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { 
  Modal, 
  SafeAreaView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View,
  FlatList,
  Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import provinces from '@/utils/data/provinces.json';

interface Province {
  code: string;
  label: string;
}

interface LocationSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (province: Province) => void;
  selectedLocation?: string;
}

export function LocationSelector({ visible, onClose, onSelect, selectedLocation }: LocationSelectorProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProvinces = provinces.filter(province =>
    province.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (province: Province) => {
    onSelect(province);
    onClose();
    setSearchQuery('');
  };

  const renderProvinceItem = ({ item }: { item: Province }) => {
    const isSelected = selectedLocation === item.code;
    
    return (
      <TouchableOpacity
        style={[
          styles.provinceItem,
          { borderBottomColor: colors.tabIconDefault },
          isSelected && { backgroundColor: colors.tint + '20' }
        ]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.provinceText,
          { color: colors.text },
          isSelected && { color: colors.tint, fontWeight: '600' }
        ]}>
          {item.label}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark" size={20} color={colors.tint} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.tabIconDefault }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t('profile.selectLocation')}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={[styles.searchContainer, { borderColor: colors.icon, backgroundColor: colors.background }]}>
            <Ionicons name="search-outline" size={20} color={colors.tabIconDefault} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={t('profile.searchLocation')}
              placeholderTextColor={colors.tabIconDefault}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.tabIconDefault} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredProvinces}
            renderItem={renderProvinceItem}
            keyExtractor={(item) => item.code}
            showsVerticalScrollIndicator={false}
            style={styles.provincesList}
            contentContainerStyle={styles.provincesListContent}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    ...Platform.select({
      ios: {
        paddingVertical: 0,
      },
    }),
  },
  provincesList: {
    flex: 1,
  },
  provincesListContent: {
    paddingBottom: 20,
  },
  provinceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    marginHorizontal: -16,
  },
  provinceText: {
    fontSize: 16,
    flex: 1,
  },
});