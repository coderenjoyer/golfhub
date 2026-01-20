import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { Users, TrendingUp, Calendar, ChevronRight, Settings, AlertCircle, LogOut } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../../../constants/colors';
import { supabase } from '../../../lib/supabase';
import { Alert } from 'react-native';

const AdminDashboard: React.FC = () => {
    const navigation = useNavigation<any>();

    // Mock Data
    const stats = {
        pendingRequests: 7,
        utilization: 80,
    };

    const upcomingTournaments = [
        { id: 1, name: 'Summer Open 2026', date: 'Nov 15, 2026', status: 'Registration Open' },
        { id: 2, name: 'Wack Wack Charity', date: 'Dec 05, 2026', status: 'Planning' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.headerTitle}>Command Center</Text>
                    <Text style={styles.headerSubtitle}>Admin Control Panel</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity style={styles.settingsButton} onPress={() => {
                        Alert.alert(
                            "Logout",
                            "Are you sure you want to log out?",
                            [
                                { text: "Cancel", style: "cancel" },
                                {
                                    text: "Logout",
                                    style: "destructive",
                                    onPress: async () => {
                                        const { error } = await supabase.auth.signOut();
                                        if (error) Alert.alert("Error", error.message);
                                    }
                                }
                            ]
                        );
                    }}>
                        <LogOut color={COLORS.error} size={24} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.settingsButton}>
                        <Settings color={COLORS.dark} size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Key Metrics Grid */}
                <View style={styles.statsGrid}>
                    <TouchableOpacity style={styles.statCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                            <Users size={22} color="#1565C0" />
                        </View>
                        <View>
                            <Text style={styles.statValue}>{stats.pendingRequests}</Text>
                            <Text style={styles.statLabel}>Pending Requests</Text>
                        </View>
                        {stats.pendingRequests > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>Action Needed</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.statCard}>
                        <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                            <TrendingUp size={22} color={COLORS.primary} />
                        </View>
                        <View>
                            <Text style={styles.statValue}>{stats.utilization}%</Text>
                            <Text style={styles.statLabel}>Today's Utilization</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Tournaments Management */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Upcoming Tournaments</Text>
                        <TouchableOpacity>
                            <Text style={styles.actionText}>Manage All</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.cardContainer}>
                        {upcomingTournaments.map((t) => (
                            <TouchableOpacity key={t.id} style={styles.listRow}>
                                <View style={styles.listIcon}>
                                    <Calendar size={20} color={COLORS.primary} />
                                </View>
                                <View style={styles.listContent}>
                                    <Text style={styles.listTitle}>{t.name}</Text>
                                    <Text style={styles.listSubtitle}>{t.date} • {t.status}</Text>
                                </View>
                                <ChevronRight size={20} color={COLORS.textLight} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Maintenance / Course Status or other Admin widgets could go here */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                    </View>
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity style={styles.actionButton}>
                            <Text style={styles.actionButtonText}>Create Tournament</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.secondaryAction]}>
                            <Text style={[styles.actionButtonText, styles.secondaryActionText]}>Manage Users</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 40 : 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: COLORS.dark,
    },
    headerSubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 2,
    },
    settingsButton: {
        padding: 8,
        backgroundColor: COLORS.gray,
        borderRadius: 12,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        justifyContent: 'space-between',
        minHeight: 140,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    badge: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: COLORS.error,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    actionText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    cardContainer: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    listRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    listIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.lightBlue,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    listContent: {
        flex: 1,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.dark,
        marginBottom: 4,
    },
    listSubtitle: {
        fontSize: 13,
        color: COLORS.textLight,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        backgroundColor: COLORS.dark,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.dark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    secondaryAction: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: COLORS.gray,
        shadowColor: '#000',
        shadowOpacity: 0.05,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    secondaryActionText: {
        color: COLORS.dark,
    },
});

export default AdminDashboard;
