import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { AuthContext } from '../src/contexts/AuthContext';
import { PremiumBlurWrapper } from '../src/components/PremiumBlurWrapper';
import { BorderRadius, Colors, Spacing } from '../constants/theme';
import { subscriptionAPI } from '../src/services/api';

const PLANS = {
  trial: {
    key: 'trial',
    label: 'Free Trial',
    amount: 'LKR 0',
    period: '',
    subtitle: '30 days • No card needed',
    features: ['Profile visible to students', 'Receive chat requests', 'Full access for 30 days'],
  },
  monthly: {
    key: 'monthly',
    label: 'Monthly',
    amount: 'LKR 3,000',
    period: '/mo',
    subtitle: 'Cancel anytime',
    features: ['Profile visible to 10k+ students', 'Unlimited student messages', 'Priority listing in search'],
  },
  annual: {
    key: 'annual',
    label: 'Annual',
    amount: 'LKR 18,000',
    period: '/yr',
    subtitle: 'Only LKR 1,500/mo',
    features: [
      'Profile visible to 10k+ students',
      'Unlimited student messages',
      'Save LKR 18,000/year vs monthly billing',
      'Priority support',
    ],
  },
};

export default function SubscriptionScreen() {
  const { user } = useContext(AuthContext) || {};
  const tutorId = user?.id || user?._id;
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState(null);
  const [busyPlan, setBusyPlan] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const load = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      if (!tutorId) return;
      const res = await subscriptionAPI.getByTutorId(tutorId);
      setSub(res.subscription || null);
    } catch (err) {
      if (showLoader) Alert.alert('Error', err.message || 'Failed to load subscription');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    load(true);
  }, [tutorId]);

  useFocusEffect(
    React.useCallback(() => {
      load(false);
      const timer = setInterval(() => load(false), 15000);
      return () => clearInterval(timer);
    }, [tutorId])
  );

  const activePlanKey = useMemo(() => {
    if (!sub || !sub.active) return '';
    return sub.plan || (sub.isTrial ? 'trial' : '');
  }, [sub]);
  const hideTrialCard = activePlanKey === 'trial';
  const annualSavingsLabel = 'Save LKR 18,000/year';
  const trialIsActive = activePlanKey === 'trial';

  const formatCardNumber = (value) =>
    String(value || '')
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(.{4})/g, '$1 ')
      .trim();

  const formatExpiry = (value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const runTrial = async () => {
    try {
      setBusyPlan('trial');
      await subscriptionAPI.startTrial();
      await load(false);
      Alert.alert('Success', 'Free trial started');
    } catch (err) {
      Alert.alert('Failed', err.message || 'Could not update subscription');
    } finally {
      setBusyPlan('');
    }
  };

  const runPaidSubscription = async () => {
    if (!selectedPlan || !['monthly', 'annual'].includes(selectedPlan)) return;
    if (!cardName.trim() || !cardNumber.trim() || !expiry.trim() || !cvc.trim()) {
      Alert.alert('Missing Details', 'Please fill all card fields.');
      return;
    }
    if (cardNumber.replace(/\s/g, '').length < 16) {
      Alert.alert('Invalid Card', 'Card number should have 16 digits.');
      return;
    }
    const [mm, yy] = expiry.split('/');
    if (!mm || !yy || mm.length !== 2 || yy.length !== 2) {
      Alert.alert('Invalid Expiry', 'Use MM/YY format.');
      return;
    }

    try {
      setSubmitting(true);
      await subscriptionAPI.pay(selectedPlan);
      await load(false);
      setSelectedPlan(null);
      setCardName('');
      setCardNumber('');
      setExpiry('');
      setCvc('');
      Alert.alert('Success', `${PLANS[selectedPlan].label} plan is now active.`);
    } catch (err) {
      Alert.alert('Payment Failed', err.message || 'Could not process payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert('Cancel Subscription', 'Are you sure you want to cancel your subscription? This will move the current plan to your subscription history.', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
        try {
          setSubmitting(true);
          await subscriptionAPI.cancel();
          await load(true);
          Alert.alert('Success', 'Subscription cancelled successfully.');
        } catch (err) {
          Alert.alert('Failed', err.message || 'Failed to cancel subscription.');
        } finally {
          setSubmitting(false);
        }
      }}
    ]);
  };

  const handleDeleteHistory = async (index) => {
    Alert.alert('Delete History', 'Are you sure you want to delete this subscription history record? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await subscriptionAPI.deleteHistory(index);
          await load(false);
          Alert.alert('Success', 'History record deleted.');
        } catch (err) {
          Alert.alert('Failed', err.message || 'Failed to delete history record.');
        }
      }}
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <PremiumBlurWrapper>
      <LinearGradient colors={['#06040f', '#0d0920', '#06040f']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { marginTop: 24 }]}>Choose a Plan</Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 20 }}>Select the best plan to unlock tutor visibility and chat access.</Text>

          {Object.values(PLANS).map((plan) => {
            const isActive = activePlanKey === plan.key;
            const disabled = !!busyPlan || submitting;
            return (
              <View
                key={plan.key}
                style={[
                  styles.planCard,
                  plan.key === 'trial' && { borderColor: 'rgba(34,197,94,0.35)', backgroundColor: 'rgba(34,197,94,0.03)' },
                  plan.key === 'monthly' && { borderColor: 'rgba(99,102,241,0.3)', backgroundColor: 'rgba(99,102,241,0.03)' },
                  plan.key === 'annual' && { borderColor: 'rgba(168,85,247,0.8)', backgroundColor: 'rgba(168,85,247,0.06)' },
                ]}
              >
                {plan.key === 'annual' ? (
                  <LinearGradient colors={['#a855f7', '#7e22ce']} style={styles.bestValueBadge}>
                    <Text style={styles.bestValueText}>⭐ Best Value</Text>
                  </LinearGradient>
                ) : null}
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>{plan.label}</Text>
                  {isActive ? <Text style={styles.badge}>ACTIVE</Text> : null}
                </View>
                <View style={styles.priceRow}>
                  <Text style={[styles.amount, plan.key === 'trial' ? { color: '#4ade80' } : {}]}>{plan.amount}</Text>
                  {!!plan.period && <Text style={styles.period}>{plan.period}</Text>}
                  {plan.key === 'annual' ? <Text style={styles.saveChip}>50% off</Text> : null}
                </View>
                <Text style={styles.planSub}>{plan.subtitle}</Text>
                
                <View style={{ marginTop: 10, marginBottom: 4 }}>
                  {plan.features.map((feature) => (
                    <View key={feature} style={styles.featureRow}>
                      <Text style={[styles.featureIcon, { color: plan.key === 'trial' ? '#22c55e' : (plan.key === 'annual' ? '#c084fc' : '#818cf8') }]}>✓</Text>
                      <Text style={styles.feature}>{feature}</Text>
                    </View>
                  ))}
                </View>
                {plan.key === 'annual' ? <Text style={styles.annualSavings}>{annualSavingsLabel}</Text> : null}

                {plan.key === 'trial' ? (
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity
                      disabled={disabled || isActive}
                      onPress={runTrial}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={isActive ? ['rgba(34,197,94,0.15)', 'rgba(34,197,94,0.05)'] : ['#22c55e', '#16a34a']}
                        style={[styles.btn, isActive && { borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' }]}
                      >
                        <Text style={[styles.btnText, isActive && { color: '#86efac' }]}>
                          {isActive ? 'Already Active' : busyPlan === 'trial' ? 'Starting...' : 'Start Free Trial'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    {isActive && (
                      <TouchableOpacity
                        disabled={disabled}
                        onPress={handleCancel}
                        activeOpacity={0.8}
                        style={[styles.btn, { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', marginTop: 0 }]}
                      >
                        <Text style={[styles.btnText, { color: '#ff6b6b' }]}>Cancel Subscription</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {!isActive ? (
                      <TouchableOpacity
                        disabled={disabled}
                        onPress={() => setSelectedPlan(plan.key)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={plan.key === 'annual' ? ['#a855f7', '#7e22ce'] : ['#6366f1', '#4f46e5']}
                          style={[styles.btn, isActive && { borderWidth: 1, borderColor: 'rgba(168,85,247,0.5)' }]}
                        >
                          <Text style={[styles.btnText]}>
                            Subscribe {plan.label}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        disabled={disabled}
                        onPress={handleCancel}
                        activeOpacity={0.8}
                        style={[styles.btn, { backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)', marginTop: 0 }]}
                      >
                        <Text style={[styles.btnText, { color: '#ff6b6b' }]}>Cancel Subscription</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        <Modal
          visible={!!selectedPlan}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setSelectedPlan(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.paymentCard}>
              <View style={styles.paymentHeaderRow}>
                <Text style={styles.paymentTitle}>Payment Details</Text>
                <TouchableOpacity onPress={() => setSelectedPlan(null)}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 20 }}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.paymentSub}>
                Paying for {selectedPlan ? PLANS[selectedPlan]?.label : ''} ({selectedPlan ? PLANS[selectedPlan]?.amount : ''})
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name on card</Text>
                <TextInput
                  value={cardName}
                  onChangeText={setCardName}
                  placeholder="e.g. Jane Doe"
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Card Number</Text>
                <TextInput
                  value={cardNumber}
                  onChangeText={(v) => setCardNumber(formatCardNumber(v))}
                  placeholder="4242 4242 4242 4242"
                  placeholderTextColor="rgba(0,0,0,0.3)"
                  style={styles.input}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.inputLabel}>Expiry</Text>
                  <TextInput
                    value={expiry}
                    onChangeText={(v) => setExpiry(formatExpiry(v))}
                    placeholder="MM/YY"
                    placeholderTextColor="rgba(0,0,0,0.3)"
                    style={styles.input}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.inputGroup, styles.half]}>
                  <Text style={styles.inputLabel}>CVC</Text>
                  <TextInput
                    value={cvc}
                    onChangeText={(v) => setCvc(String(v || '').replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    placeholderTextColor="rgba(0,0,0,0.3)"
                    style={styles.input}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.payBtn} onPress={runPaidSubscription} disabled={submitting}>
                <LinearGradient
                  colors={selectedPlan === 'annual' ? ['#7C3AED', '#4F46E5'] : ['#6C63FF', '#3B82F6']}
                  style={styles.payBtnGrad}
                >
                  <Text style={styles.payBtnText}>
                    {submitting ? 'Processing...' : `Pay ${selectedPlan ? PLANS[selectedPlan]?.amount : ''}`}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setSelectedPlan(null)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    </PremiumBlurWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: 18 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#06040f' },
  back: { marginTop: 8, marginBottom: 8 },
  backText: { color: Colors.textMuted, fontSize: 14 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  planCard: {
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    zIndex: 2,
  },
  bestValueText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  badge: {
    color: '#86efac',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
    backgroundColor: 'rgba(34,197,94,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 8 },
  amount: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  period: { color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '600' },
  saveChip: {
    marginLeft: 8,
    marginBottom: 6,
    fontSize: 10,
    fontWeight: '800',
    color: '#34d399',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.45)',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  planSub: { color: 'rgba(255,255,255,0.5)', marginBottom: 16, fontSize: 13 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  featureIcon: { fontSize: 14, fontWeight: '900', marginRight: 10, marginTop: 1 },
  feature: { color: 'rgba(255,255,255,0.9)', fontSize: 14, flex: 1, lineHeight: 20 },
  annualSavings: { color: '#c084fc', fontSize: 12, fontWeight: '800', marginTop: 4, marginBottom: 8 },
  btn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentCard: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#0d0920',
    borderWidth: 1,
    borderColor: 'rgba(124,111,255,0.3)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  paymentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentTitle: { color: '#ffffff', fontWeight: '900', fontSize: 20 },
  paymentSub: { color: 'rgba(255,255,255,0.6)', marginTop: 4, marginBottom: 12, fontSize: 13 },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    color: '#111827',
    fontSize: 15,
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  payBtn: { marginTop: 8 },
  payBtnGrad: { borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center' },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  cancelBtn: { marginTop: 24, paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '700' },
});
