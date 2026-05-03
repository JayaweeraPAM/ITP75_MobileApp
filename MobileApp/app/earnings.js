import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { bookingAPI } from '../src/services/api';
import { BorderRadius, Colors, Spacing } from '../constants/theme';
import { PremiumBlurWrapper } from '../src/components/PremiumBlurWrapper';

export default function EarningsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState({ totalEarnings: 0, completedCount: 0 });
  const [recentCompleted, setRecentCompleted] = useState([]);

  const load = async () => {
    try {
      const [earningsRes, bookingsRes] = await Promise.all([bookingAPI.earnings(), bookingAPI.getTutorBookings()]);
      setSummary({
        totalEarnings: Number(earningsRes?.totalEarnings || 0),
        completedCount: Number(earningsRes?.completedCount || 0),
      });
      const completed = (bookingsRes?.bookings || [])
        .filter((b) => b.status === 'COMPLETED')
        .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
      setRecentCompleted(completed);
    } catch {
      setSummary({ totalEarnings: 0, completedCount: 0 });
      setRecentCompleted([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#7C6FFF" size="large" />
      </View>
    );
  }

  const grossEarnings = summary.totalEarnings;
  const netEarnings = grossEarnings * 0.9; // Assuming 10% fee
  const platformFee = grossEarnings * 0.1;

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <Text style={styles.pageTitle}>🕓 Tutor Earnings</Text>

      <View style={styles.cardsCol}>
        {/* Card 1 */}
        <View style={[styles.metricCard, { backgroundColor: 'rgba(124,111,255,0.08)', borderColor: 'rgba(124,111,255,0.25)' }]}>
          <Text style={styles.metricLabel}>Total Gross Revenue</Text>
          <Text style={[styles.metricValuePrimary, { color: '#9d8bfb' }]}>LKR {grossEarnings.toLocaleString()}</Text>
          <Text style={styles.metricSub}>📈 Overall platform income</Text>
        </View>

        {/* Card 2 */}
        <View style={[styles.metricCard, { backgroundColor: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.25)' }]}>
          <Text style={styles.metricLabel}>Completed Sessions</Text>
          <Text style={[styles.metricValuePrimary, { color: '#60a5fa' }]}>{summary.completedCount}</Text>
          <Text style={styles.metricSub}>Active Sessions: {summary.completedCount}</Text>
        </View>

        {/* Card 3 */}
        <View style={[styles.metricCard, { backgroundColor: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.25)' }]}>
          <Text style={styles.metricLabel}>Platform Fees (10%)</Text>
          <Text style={[styles.metricValuePrimary, { color: '#4ade80' }]}>LKR {platformFee.toLocaleString()}</Text>
          <Text style={styles.metricSub}>Net: LKR {netEarnings.toLocaleString()}</Text>
        </View>
      </View>

      {/* Financial Health Banner */}
      <View style={styles.healthBanner}>
        <View style={{ flex: 1, paddingRight: 20 }}>
          <Text style={styles.healthTitle}>📈 Financial Health</Text>
          <Text style={styles.healthDesc}>
            The platform generates revenue through a 10% service charge on all successful bookings and fixed subscription fees from registered tutors.
          </Text>
        </View>
        <View style={styles.activeRing}>
          <View style={styles.activeRingInner}>
            <Text style={styles.activeText}>Active</Text>
          </View>
        </View>
      </View>

      <Text style={styles.tableTitle}>🕓 Session Payments</Text>
      
      {/* Table Header */}
      {recentCompleted.length > 0 && (
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 1 }]}>Date</Text>
          <Text style={[styles.th, { flex: 1 }]}>Student</Text>
          <Text style={[styles.th, { flex: 1.2 }]}>Subject</Text>
          <Text style={[styles.th, { width: 90, textAlign: 'right' }]}>Amount</Text>
        </View>
      )}
    </View>
  );

  return (
    <PremiumBlurWrapper>
      <View style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.75}>
            <Text style={styles.backIcon}>← Back to Dashboard</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={recentCompleted}
          keyExtractor={(item, index) => `completed-${item.id || index}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C6FFF" />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No completed sessions yet</Text>
              <Text style={styles.emptySub}>Your earnings will appear here once sessions are marked as completed.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.tableRow}>
              <Text style={[styles.td, { flex: 1 }]} numberOfLines={1}>
                {new Date(item.dateTime).toLocaleDateString()}
              </Text>
              <Text style={[styles.td, { flex: 1, color: '#fff', fontWeight: '600' }]} numberOfLines={1}>
                {item.studentName || 'Student'}
              </Text>
              <Text style={[styles.td, { flex: 1.2 }]} numberOfLines={1}>
                {item.subject || 'Session'}
              </Text>
              <Text style={[styles.td, { width: 90, textAlign: 'right', color: '#9d8bfb' }]}>
                +{Number(item.price || 0).toLocaleString()}
              </Text>
            </View>
          )}
        />
      </View>
    </PremiumBlurWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D12' },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0D12' },
  topNav: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
  },
  backBtn: { paddingVertical: 10 },
  backIcon: { color: '#EAEAEA', fontSize: 14, fontWeight: '600' },
  list: { paddingBottom: 40 },
  headerContent: { paddingHorizontal: 20 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 24, letterSpacing: -0.5 },
  
  cardsCol: { gap: 12, marginBottom: 24 },
  metricCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    justifyContent: 'center',
  },
  metricLabel: { color: '#EAEAEA', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  metricValuePrimary: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 12 },
  metricSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },

  healthBanner: {
    backgroundColor: '#111218',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1a1b23',
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  healthTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  healthDesc: { color: '#A0A0A5', fontSize: 13, lineHeight: 20 },
  activeRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: '#7C6FFF',
    borderRightColor: '#1a1b23',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-45deg' }],
  },
  activeRingInner: {
    transform: [{ rotate: '45deg' }],
  },
  activeText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  tableTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1b23',
    marginBottom: 8,
  },
  th: { color: '#A0A0A5', fontSize: 12, fontWeight: '700' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1b23',
  },
  td: { color: '#A0A0A5', fontSize: 13 },

  emptyWrap: { alignItems: 'center', paddingTop: 40 },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySub: { color: '#6A6C75', textAlign: 'center', fontSize: 13, lineHeight: 20 },
});
