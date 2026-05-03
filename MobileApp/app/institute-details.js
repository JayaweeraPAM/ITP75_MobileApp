import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { instituteAPI } from '../src/services/api';
import { Colors, BorderRadius, Spacing } from '../constants/theme';
import { GlassCard } from '../src/components/GlassCard';
import { PremiumBlurWrapper } from '../src/components/PremiumBlurWrapper';

export default function InstituteDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [institute, setInstitute] = useState(null);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    instituteAPI.list()
      .then((res) => {
        const ins = (res.institutes || []).find((x) => String(x.id) === String(id));
        if (ins) {
          setInstitute(ins);
        } else {
          setInstitute({
            id,
            name: 'Advanced Science Institute',
            location: 'Colombo & Online',
            description: 'Top tier institute for Physics, Maths, and Biology with live-classes and physical branches.',
          });
        }
        setTutors([
          { id: '1', name: 'Dr. Thilina', rating: 4.8, subjects: ['Physics', 'Combined Maths'] },
          { id: '2', name: 'Mrs. Jayani', rating: 4.9, subjects: ['Chemistry', 'Biology'] },
        ]);
      })
      .catch((err) => {
        Alert.alert('Error', err.message || 'Failed to load institute');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#0EA5E9" size="large" />
      </View>
    );
  }

  if (!institute) {
    return (
      <View style={styles.loader}>
        <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Institute not found</Text>
      </View>
    );
  }

  return (
    <PremiumBlurWrapper>
      <LinearGradient colors={['#06040f', '#100825', '#06040f']} style={styles.gradient}>
        <View style={styles.blobTopLeft} />
        <View style={styles.blobBottomRight} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>

          <GlassCard style={styles.headerCard}>
            <LinearGradient colors={['#0EA5E9', '#0284C7']} style={styles.badge}>
              <Text style={styles.badgeText}>INSTITUTE PROFILE</Text>
            </LinearGradient>
            <Text style={styles.name}>{institute.name}</Text>
            <Text style={styles.location}>📍 {institute.location || 'Online + Physical Branches'}</Text>
          </GlassCard>

          <Text style={styles.sectionTitle}>About</Text>
          <GlassCard style={styles.aboutCard}>
            <Text style={styles.aboutText}>{institute.description || 'Dedicated learning center offering high-quality advanced level tutoring sessions from qualified lecturers.'}</Text>
          </GlassCard>

          <Text style={styles.sectionTitle}>Tutors ({tutors.length})</Text>
          {tutors.map((tutor) => (
            <TouchableOpacity key={tutor.id} onPress={() => router.push(`/tutor-profile?id=${tutor.id}`)} activeOpacity={0.85}>
              <GlassCard style={styles.tutorCard}>
                <View style={styles.tutorHeader}>
                  <LinearGradient colors={['#0EA5E9', '#0284C7']} style={styles.avatar}>
                    <Text style={styles.avatarChar}>{(tutor.name || '?')[0]}</Text>
                  </LinearGradient>
                  <View>
                    <Text style={styles.tutorName}>{tutor.name}</Text>
                    <Text style={styles.tutorRating}>⭐ {tutor.rating} rating</Text>
                  </View>
                </View>

                <View style={styles.subjects}>
                  {(tutor.subjects || []).map((s, idx) => (
                    <View key={idx} style={styles.subjectChip}>
                      <Text style={styles.subjectText}>{s}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.viewLink}>View profile →</Text>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>
    </PremiumBlurWrapper>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.lg, paddingBottom: 100 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#06040f' },
  blobTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(14,165,233,0.14)',
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(2,132,199,0.12)',
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: Spacing.lg,
    marginTop: 20,
  },
  backBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  headerCard: { padding: Spacing.lg, marginBottom: Spacing.md },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: Spacing.sm,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  name: { color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 4, letterSpacing: -0.5 },
  location: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  aboutCard: { padding: Spacing.md },
  aboutText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22 },
  tutorCard: { padding: Spacing.md, marginBottom: 12 },
  tutorHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarChar: { color: '#fff', fontSize: 18, fontWeight: '800' },
  tutorName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  tutorRating: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 1 },
  subjects: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 12 },
  subjectChip: {
    backgroundColor: 'rgba(14,165,233,0.12)',
    borderColor: 'rgba(14,165,233,0.22)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  subjectText: { color: '#38bdf8', fontSize: 11, fontWeight: '600' },
  viewLink: { color: '#0ea5e9', fontSize: 13, fontWeight: '600', alignSelf: 'flex-end' },
});
