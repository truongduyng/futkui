import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconSymbol } from './IconSymbol';

interface TabIconWithBadgeProps {
  name: 'house.fill' | 'paperplane.fill' | 'message.fill' | 'chevron.left.forwardslash.chevron.right' | 'chevron.right';
  color: string;
  size?: number;
  badgeCount?: number;
}

export function TabIconWithBadge({ name, color, size = 28, badgeCount = 0 }: TabIconWithBadgeProps) {
  return (
    <View style={styles.container}>
      <IconSymbol size={size} name={name} color={color} />
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 99 ? '99+' : badgeCount.toString()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 2,
  },
});