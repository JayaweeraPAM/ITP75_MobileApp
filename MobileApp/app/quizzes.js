import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { quizzesAPI } from '../src/services/api';
import { PremiumBlurWrapper } from '../src/components/PremiumBlurWrapper';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function QuizzesScreen() {
  const [phase, setPhase] = useState('intro'); // intro, quiz, result
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRef = useRef(null);

  useEffect(() => {
    fetchQuizzes();
    return () => clearInterval(timerRef.current);
  }, []);

  const fetchQuizzes = async () => {
    try {
      const res = await quizzesAPI.getPublicQuizzes();
      if (res && res.quizzes) {
        setQuizzes(res.quizzes);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = (quiz) => {
    setActiveQuiz(quiz);
    setCurrent(0);
    setAnswers(new Array(quiz.questions.length).fill(null));
    setTimeLeft(quiz.timeLimit * 60);
    setPhase('quiz');

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          setPhase('result');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const selectAnswer = (idx) => {
    const newAnswers = [...answers];
    newAnswers[current] = idx;
    setAnswers(newAnswers);
  };

  const nextQuestion = () => {
    if (current < activeQuiz.questions.length - 1) {
      setCurrent(current + 1);
    }
  };

  const prevQuestion = () => {
    if (current > 0) {
      setCurrent(current - 1);
    }
  };

  const submitQuiz = () => {
    clearInterval(timerRef.current);
    setPhase('result');
  };

  if (loading) {
    return (
      <PremiumBlurWrapper>
        <LinearGradient colors={['#06040f', '#0d0920']} style={styles.center}>
          <ActivityIndicator size="large" color="#7C6FFF" />
        </LinearGradient>
      </PremiumBlurWrapper>
    );
  }

  if (phase === 'intro') {
    return (
      <PremiumBlurWrapper>
        <LinearGradient colors={['#06040f', '#0d0920', '#06040f']} style={styles.container}>
          <StatusBar barStyle="light-content" />
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTitleBox}>
              <Ionicons name="bulb" size={20} color="#fff" />
              <Text style={styles.headerTitle}>Examination Gateway</Text>
            </View>
          </View>
          
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.pageTitle}>Assessment Modules</Text>
            <Text style={styles.pageSub}>Academic modules ready for initialization.</Text>

            {quizzes.map((quiz) => (
              <TouchableOpacity key={quiz.id} activeOpacity={0.8} onPress={() => startQuiz(quiz)}>
                <LinearGradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.01)']} style={styles.quizCard}>
                  <View style={styles.quizHeader}>
                    <View style={styles.quizBadge}>
                      <Text style={styles.quizBadgeText}>{quiz.subject}</Text>
                    </View>
                    <Text style={styles.quizCategory}>{quiz.category}</Text>
                  </View>
                  <Text style={styles.quizTitle}>{quiz.title}</Text>
                  <Text style={styles.quizDesc} numberOfLines={2}>{quiz.description}</Text>
                  <View style={styles.quizMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={16} color="#10b981" />
                      <Text style={styles.metaText}>{quiz.timeLimit} Min</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="list" size={16} color="#3b82f6" />
                      <Text style={styles.metaText}>{quiz.questions.length} Units</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}

            {quizzes.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No quizzes available right now.</Text>
              </View>
            )}
          </ScrollView>
        </LinearGradient>
      </PremiumBlurWrapper>
    );
  }

  if (phase === 'quiz') {
    const q = activeQuiz.questions[current];
    const timePct = (timeLeft / (activeQuiz.timeLimit * 60)) * 100;
    
    return (
      <PremiumBlurWrapper>
        <LinearGradient colors={['#06040f', '#0d0920']} style={styles.container}>
           <View style={styles.quizHeaderBar}>
             <View style={styles.quizHeaderTop}>
                <Text style={styles.quizHeaderTitle} numberOfLines={1}>{activeQuiz.title}</Text>
                <Text style={[styles.timerText, timeLeft < 60 && {color: '#ef4444'}]}>{formatTime(timeLeft)}</Text>
             </View>
             <View style={styles.progressTrack}>
               <View style={[styles.progressBar, { width: SCREEN_WIDTH * (timePct / 100) - 40 }]} />
             </View>
          </View>

          <View style={styles.questionContainer}>
            <View style={styles.qTop}>
               <Text style={styles.qNum}>Question {current + 1} / {activeQuiz.questions.length}</Text>
            </View>
            <Text style={styles.qText}>{q.text}</Text>
          </View>

          <ScrollView contentContainerStyle={styles.optionsContainer}>
            {q.options.map((opt, idx) => {
              const isSelected = answers[current] === idx;
              return (
                <TouchableOpacity key={idx} activeOpacity={0.8} onPress={() => selectAnswer(idx)}>
                   <LinearGradient colors={isSelected ? ['rgba(59,130,246,0.3)', 'rgba(59,130,246,0.1)'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']} style={[styles.optionCard, isSelected && styles.optionSelected]}>
                      <View style={[styles.optionLetterBox, isSelected && styles.optionLetterSelected]}>
                        <Text style={[styles.optionLetter, isSelected && styles.optionLetterSelectedText]}>{String.fromCharCode(65 + idx)}</Text>
                      </View>
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{opt}</Text>
                   </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.quizFooter}>
            <TouchableOpacity onPress={prevQuestion} disabled={current === 0} style={[styles.navBtn, current === 0 && {opacity:0.3}]}>
               <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            {current === activeQuiz.questions.length - 1 ? (
              <TouchableOpacity onPress={submitQuiz} style={styles.submitBtn}>
                <Text style={styles.submitText}>Submit</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={nextQuestion} style={styles.navBtn}>
                 <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </PremiumBlurWrapper>
    );
  }

  if (phase === 'result') {
    const total = activeQuiz.questions.length;
    const score = answers.filter((a, i) => a === activeQuiz.questions[i].correctAnswer).length;
    const percent = Math.round((score / total) * 100);

    return (
      <PremiumBlurWrapper>
        <LinearGradient colors={['#06040f', '#0d0920']} style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setPhase('intro')} style={styles.backBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTitleBox}>
              <Text style={styles.headerTitle}>Audit Report</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
             <View style={styles.scoreCard}>
                <Text style={styles.scorePercent}>{percent}%</Text>
                <Text style={styles.scoreLabel}>Accuracy Factor</Text>
             </View>

             <View style={{marginTop: 30}}>
               {activeQuiz.questions.map((q, i) => {
                 const isCorrect = answers[i] === q.correctAnswer;
                 return (
                   <View key={i} style={[styles.resultBox, isCorrect ? styles.resultCorrect : styles.resultWrong]}>
                      <View style={{flexDirection: 'row', gap: 10, alignItems: 'flex-start'}}>
                         <Ionicons name={isCorrect ? "checkmark-circle" : "close-circle"} size={24} color={isCorrect ? "#10b981" : "#ef4444"} />
                         <View style={{flex: 1}}>
                            <Text style={styles.resultQText}>{q.text}</Text>
                            <View style={styles.resultAnsBox}>
                               <Text style={styles.resultAnsLabel}>Your Response</Text>
                               <Text style={[styles.resultAnsVal, isCorrect ? {color: '#10b981'} : {color: '#ef4444'}]}>
                                  {answers[i] !== null ? q.options[answers[i]] : 'Skipped'}
                               </Text>
                            </View>
                            {!isCorrect && (
                              <View style={[styles.resultAnsBox, {marginTop: 8}]}>
                                 <Text style={styles.resultAnsLabel}>Target Response</Text>
                                 <Text style={styles.resultAnsValTarget}>{q.options[q.correctAnswer]}</Text>
                              </View>
                            )}
                         </View>
                      </View>
                   </View>
                 );
               })}
             </View>
          </ScrollView>
        </LinearGradient>
      </PremiumBlurWrapper>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  headerTitleBox: { flexDirection: 'row', alignItems: 'center', marginLeft: 16, gap: 8 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },
  pageTitle: { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 4 },
  pageSub: { color: '#3b82f6', fontSize: 14, fontWeight: '600', marginBottom: 24, opacity: 0.8 },
  
  quizCard: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 16 },
  quizHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  quizBadge: { backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  quizBadgeText: { color: '#3b82f6', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  quizCategory: { color: '#9ca3af', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  quizTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 8 },
  quizDesc: { color: '#9ca3af', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  quizMeta: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingTop: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  emptyBox: { padding: 40, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20 },
  emptyText: { color: '#9ca3af', fontSize: 14 },

  quizHeaderBar: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: 'rgba(0,0,0,0.3)', borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  quizHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  quizHeaderTitle: { color: '#fff', fontSize: 16, fontWeight: '800', flex: 1, marginRight: 16 },
  timerText: { color: '#3b82f6', fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
  progressTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 },
  progressBar: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 2 },
  
  questionContainer: { padding: 24 },
  qTop: { marginBottom: 16 },
  qNum: { color: '#3b82f6', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  qText: { color: '#fff', fontSize: 24, fontWeight: '900', lineHeight: 32 },
  
  optionsContainer: { paddingHorizontal: 24, paddingBottom: 40, gap: 12 },
  optionCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.05)' },
  optionSelected: { borderColor: '#3b82f6' },
  optionLetterBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  optionLetterSelected: { backgroundColor: '#3b82f6' },
  optionLetter: { color: '#9ca3af', fontSize: 16, fontWeight: '900' },
  optionLetterSelectedText: { color: '#fff' },
  optionText: { color: '#9ca3af', fontSize: 16, fontWeight: '700', flex: 1 },
  optionTextSelected: { color: '#fff' },
  
  quizFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 24, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.3)' },
  navBtn: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  submitBtn: { flex: 1, marginLeft: 16, backgroundColor: '#3b82f6', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },

  scoreCard: { alignItems: 'center', padding: 40, backgroundColor: 'rgba(59,130,246,0.05)', borderRadius: 32, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  scorePercent: { fontSize: 64, fontWeight: '900', color: '#fff' },
  scoreLabel: { fontSize: 12, fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1, marginTop: 8 },
  
  resultBox: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
  resultCorrect: { backgroundColor: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' },
  resultWrong: { backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' },
  resultQText: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 16 },
  resultAnsBox: { backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12 },
  resultAnsLabel: { color: '#9ca3af', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  resultAnsVal: { fontSize: 14, fontWeight: '800' },
  resultAnsValTarget: { color: '#9ca3af', fontSize: 14, fontWeight: '800' },
});
