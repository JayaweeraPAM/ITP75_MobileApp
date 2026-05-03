import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumBlurWrapper } from '../src/components/PremiumBlurWrapper';
import { AuthContext } from '../src/contexts/AuthContext';
import api, { instituteAPI } from '../src/services/api';

export default function InstitutesScreen() {
  const { user } = useContext(AuthContext) || {};
  const role = String(user?.role || '').toLowerCase();
  const [loading, setLoading] = useState(true);
  const [institutes, setInstitutes] = useState([]);
  const [instituteName, setInstituteName] = useState('');
  const [myRequest, setMyRequest] = useState(null);
  const [tutorProfile, setTutorProfile] = useState(null);

  const load = async () => {
    try {
      const res = await instituteAPI.list();
      setInstitutes(res.institutes || []);
      if (role === 'tutor') {
        try {
          const profileRes = await api.get('/tutors/me/profile');
          if (profileRes?.data?.profile) {
            setTutorProfile(profileRes.data.profile);
          }
        } catch (e) {
          console.log('Failed to fetch tutor profile:', e);
        }
        const reqRes = await instituteAPI.myJoinRequest();
        setMyRequest(reqRes?.request || null);
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load institutes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const join = async (id) => {
    try {
      const res = await instituteAPI.join(id);
      Alert.alert('Success', 'Join request sent');
      if (res?.request) {
        setMyRequest(res.request);
      }
      setTimeout(() => load(), 200);
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.error || err.message || 'Could not send join request');
    }
  };

  const requestInstitute = async () => {
    if (!instituteName.trim()) return;
    try {
      await instituteAPI.requestNew(instituteName.trim());
      setInstituteName('');
      Alert.alert('Success', 'Institute request submitted');
    } catch (err) {
      Alert.alert('Failed', err.response?.data?.error || err.message || 'Could not submit request');
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#4F46E5" size="large" />
      </View>
    );
  }

  return (
    <PremiumBlurWrapper>
      <View style={styles.container}>
        {/* Subtle Mesh Glows for Visual Energy */}
        <View style={styles.glowTopRight} />
        <View style={styles.glowBottomLeft} />

        <Text style={styles.title}>Institutes</Text>
        
        {role === 'tutor' && (
          <View style={styles.requestBox}>
            <TextInput
              value={instituteName}
              onChangeText={setInstituteName}
              style={styles.input}
              placeholder="Request new institute name..."
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            <TouchableOpacity onPress={requestInstitute} activeOpacity={0.85}>
              <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.btnText}>Submit Request</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={institutes}
          keyExtractor={(item, idx) => String(item.id || idx)}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.hubBadge}>
                <Text style={styles.hubBadgeText}>✨ LEARNING HUB</Text>
              </View>

              <Text style={styles.name}>{item.name}</Text>
              
              {item.location && (
                <Text style={styles.locationText}>📍 {item.location}</Text>
              )}

              {/* Structured Info in unified tags style */}
              <View style={styles.chipsRow}>
                <View style={[styles.chip, { backgroundColor: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.25)' }]}>
                  <Text style={[styles.chipText, { color: '#818cf8' }]}>📚 Physics • Biology • Maths</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: 'rgba(236,72,153,0.12)', borderColor: 'rgba(236,72,153,0.25)' }]}>
                  <Text style={[styles.chipText, { color: '#f472b6' }]}>🏫 Mode: Online + Physical</Text>
                </View>
              </View>

              {item.description ? (
                <Text style={styles.desc}>
                  {item.description}
                </Text>
              ) : null}
              
              {role === 'tutor' && (() => {
                const isPending = myRequest?.instituteId && item.id && myRequest.instituteId === item.id;
                const isCurrentInstitute = (user?.instituteId && user.instituteId !== 'none' && user.instituteId === item.id) ||
                                           (user?.instituteName && user.instituteName.trim().toLowerCase() === item.name.trim().toLowerCase()) ||
                                           (tutorProfile?.instituteId && tutorProfile.instituteId !== 'none' && tutorProfile.instituteId === item.id);

                if (isCurrentInstitute) {
                  return (
                    <View style={[styles.joinBtnGrad, { backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', marginTop: 16 }]}>
                      <Text style={[styles.joinBtnText, { color: '#10b981' }]}>✓ Already Joined</Text>
                    </View>
                  );
                }

                if (isPending) {
                  return (
                    <View style={[styles.joinBtnGrad, { backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', marginTop: 16 }]}>
                      <Text style={[styles.joinBtnText, { color: '#f59e0b' }]}>⌛ Pending Approval</Text>
                    </View>
                  );
                }

                return (
                  <TouchableOpacity onPress={() => join(item.id)} activeOpacity={0.85} style={{ marginTop: 16 }}>
                    <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.joinBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Text style={styles.joinBtnText}>Join Institute</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })()}
            </View>
          )}
        />
      </View>
    </PremiumBlurWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0D12' },
  
  // Mesh Glows for "Color Energy"
  glowTopRight: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(59,130,246,0.04)', 
  },
  glowBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(79,70,229,0.06)', 
  },

  title: { color: '#fff', fontSize: 32, fontWeight: '900', marginBottom: 20, letterSpacing: -0.5 },
  
  // Input Section
  requestBox: { marginBottom: 24, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    fontSize: 14,
  },
  btnGrad: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Institute Card
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.18)',
    padding: 16,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  hubBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderColor: 'rgba(59,130,246,0.22)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  hubBadgeText: {
    color: '#60a5fa',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  name: { color: '#fff', fontWeight: '800', fontSize: 18, marginBottom: 4, letterSpacing: -0.3 },
  locationText: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 12 },
  desc: { color: '#94a3b8', fontSize: 13, lineHeight: 20, marginTop: 4 },
  
  // Chips
  chipsRow: { flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: '600' },

  // Join Button
  joinBtnGrad: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
