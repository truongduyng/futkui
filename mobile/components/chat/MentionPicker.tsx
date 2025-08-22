import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Member {
  id: string;
  handle: string;
  displayName?: string;
}

interface MentionPickerProps {
  members: Member[];
  searchText: string;
  onSelectMention: (member: Member) => void;
  visible: boolean;
}

export function MentionPicker({ members, searchText, onSelectMention, visible }: MentionPickerProps) {
  const { isDark } = useTheme();
const colors = isDark ? Colors.dark : Colors.light;

  if (!visible || !searchText) return null;

  // Filter members based on search text (excluding the @ symbol)
  const query = searchText.toLowerCase().replace('@', '');
  const filteredMembers = members.filter(member =>
    member.handle.toLowerCase().includes(query) ||
    (member.displayName && member.displayName.toLowerCase().includes(query))
  ).slice(0, 5); // Limit to 5 suggestions

  if (filteredMembers.length === 0) return null;

  const renderMemberItem = ({ item }: { item: Member }) => (
    <TouchableOpacity
      style={styles.memberItem}
      onPress={() => onSelectMention(item)}
    >
      <View style={styles.memberInfo}>
        <Text style={[styles.handle, { color: colors.text }]}>
          @{item.handle}
        </Text>
        {item.displayName && (
          <Text style={[styles.displayName, { color: colors.tabIconDefault }]}>
            {item.displayName}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredMembers}
        renderItem={renderMemberItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    right: 0,
    maxHeight: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 4,
  },
  list: {
    maxHeight: 200,
  },
  memberItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  memberInfo: {
    flexDirection: 'column',
  },
  handle: {
    fontSize: 16,
    fontWeight: '500',
  },
  displayName: {
    fontSize: 12,
    marginTop: 2,
  },
});
