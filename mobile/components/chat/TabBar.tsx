import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/Colors';

interface Tab {
  key: string;
  title: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.tabContainer, { backgroundColor: colors.card }]}>
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                isActive && [styles.activeTab, { backgroundColor: colors.tint }]
              ]}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? 'white' : colors.tabIconDefault },
                  isActive && styles.activeTabText
                ]}
              >
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    fontWeight: '600',
  },
});