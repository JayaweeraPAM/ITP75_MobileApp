import { StyleSheet, View, Text } from 'react-native';

export default function ExploreScreen() {
  // This tab is hidden in `(tabs)/_layout.js` (href: null).
  // Kept as a lightweight placeholder.
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Explore</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 18, fontWeight: '700' },
});

